import { apiFetch, ApiRequestError } from '../../lib/api/client';
import { db } from '../../lib/db/db';
import { syncOutbox } from './sync-outbox';
import { appStore } from '../../stores/app-store';
import { SYNC_CONSTANTS } from '../../lib/constants/sync';
import type { Task } from '../dashboard/task.types';
import type { FocusSession } from '../focus/focus.types';

export type BootstrapItem = 
  | { type: 'task'; data: Task }
  | { type: 'session'; data: FocusSession };

export class SyncService {
  private isPushing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;

  async bootstrap() {
    // 1. Get all local tasks and sessions
    const taskStore = await db.getStore('tasks');
    const sessionStore = await db.getStore('focus_sessions');

    const tasks = await new Promise<Task[]>((resolve, reject) => {
      const req = taskStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const sessions = await new Promise<FocusSession[]>((resolve, reject) => {
      const req = sessionStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    // 2. Divide into batches
    const items: BootstrapItem[] = [
      ...tasks.map(t => ({ type: 'task' as const, data: t })),
      ...sessions.map(s => ({ type: 'session' as const, data: s }))
    ];
    
    const totalBatches = Math.ceil(items.length / SYNC_CONSTANTS.BATCH_SIZE) || 1;

    appStore.setSnapshot({ 
      bootstrapStatus: 'required',
      currentBatch: 0,
      totalBatches,
      syncError: null
    });

    for (let i = 0; i < totalBatches; i++) {
      const batch = items.slice(i * SYNC_CONSTANTS.BATCH_SIZE, (i + 1) * SYNC_CONSTANTS.BATCH_SIZE);
      
      try {
        await apiFetch('/sync/bootstrap', {
          method: 'POST',
          body: JSON.stringify({
            batchIndex: i,
            totalBatches,
            items: batch
          })
        });
        
        appStore.setSnapshot({ currentBatch: i + 1 });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
        appStore.setSnapshot({ syncError: `Bootstrap failed: ${message}` });
        throw error;
      }
    }

    appStore.setSnapshot({ bootstrapStatus: 'completed' });
  }

  async push() {
    if (this.isPushing || !navigator.onLine) return;
    this.isPushing = true;

    try {
      const events = await syncOutbox.getAllEvents();
      if (events.length === 0) return;

      const coalesced = syncOutbox.coalesce(events);
      
      try {
        await apiFetch('/sync/push', {
          method: 'POST',
          body: JSON.stringify({ events: coalesced })
        });

        await syncOutbox.clearEvents(events.map(e => e.deviceSequence));
        appStore.setSnapshot({ syncError: null });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 409) {
          const serverSnapshot = error.data as unknown as { serverSnapshot: { type: 'task' | 'session'; data: Record<string, unknown> } };
          if (serverSnapshot && serverSnapshot.serverSnapshot) {
            await this.handleConflict(serverSnapshot.serverSnapshot);
          }
        } else {
          const message = error instanceof Error ? error.message : 'Unknown push error';
          appStore.setSnapshot({ syncError: `Push failed: ${message}` });
        }
        throw error;
      }
    } finally {
      this.isPushing = false;
    }
  }

  private async handleConflict(serverSnapshot: { type: 'task' | 'session'; data: Record<string, unknown> }) {
    const { type, data } = serverSnapshot;
    const storeName = type === 'task' ? 'tasks' : 'focus_sessions';
    
    const store = await db.getStore(storeName, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    appStore.setSnapshot({
      lastConflict: {
        type,
        id: (data.id as string) || (data.clientGeneratedId as string) || (data.focusSessionId as string),
        occurredAt: new Date().toISOString()
      }
    });
  }

  async pull() {
    const lastCursor = (await db.getMetadata<string>('last_pull_cursor')) || '0';
    
    try {
      const response = await apiFetch<{
        items: Array<{ type: 'task' | 'session'; data: Record<string, unknown> }>;
        nextCursor: string;
      }>(`/sync/pull?cursor=${lastCursor}`);

      for (const item of response.items) {
        const storeName = item.type === 'task' ? 'tasks' : 'focus_sessions';
        const store = await db.getStore(storeName, 'readwrite');
        await new Promise<void>((resolve, reject) => {
          const req = store.put(item.data);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      await db.putMetadata('last_pull_cursor', response.nextCursor);
      appStore.setSnapshot({ syncError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pull error';
      appStore.setSnapshot({ syncError: `Pull failed: ${message}` });
    }
  }

  initAutoSync() {
    this.destroy();

    this.onlineHandler = () => {
      this.push().catch(() => { /* error handled in push */ });
    };
    window.addEventListener('online', this.onlineHandler);

    this.intervalId = setInterval(() => {
      this.push().catch(() => { /* error handled in push */ });
    }, SYNC_CONSTANTS.AUTO_SYNC_INTERVAL_MS);
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
  }
}

export const syncService = new SyncService();
