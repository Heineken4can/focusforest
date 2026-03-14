import { db, type EntityType, type SyncOutboxEvent } from '@/lib/db/db';

export class SyncOutbox {
  async addEvent(params: {
    entityType: EntityType;
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'transition';
    payload: Record<string, unknown>;
  }): Promise<void> {
    const deviceSequence = await db.nextDeviceSequence();
    const event: SyncOutboxEvent = {
      deviceSequence,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      payload: params.payload,
      occurredAt: new Date().toISOString(),
    };

    const store = await db.getStore('sync_outbox', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllEvents(): Promise<SyncOutboxEvent[]> {
    const store = await db.getStore('sync_outbox');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearEvents(deviceSequences: number[]): Promise<void> {
    const store = await db.getStore('sync_outbox', 'readwrite');
    for (const seq of deviceSequences) {
      store.delete(seq);
    }
  }

  /**
   * Coalesce logic: Merge multiple updates for the same entity.
   * Session events (transition) are excluded from coalescing.
   */
  coalesce(events: SyncOutboxEvent[]): SyncOutboxEvent[] {
    const result: SyncOutboxEvent[] = [];
    const entityGroups: Record<string, SyncOutboxEvent[]> = {};

    for (const event of events) {
      if (event.action === 'transition') {
        result.push(event);
        continue;
      }

      const key = `${event.entityType}:${event.entityId}`;
      if (!entityGroups[key]) {
        entityGroups[key] = [];
      }
      entityGroups[key].push(event);
    }

    for (const key in entityGroups) {
      const group = entityGroups[key];
      if (group.length === 1) {
        result.push(group[0]);
        continue;
      }

      // Merge logic for mutable entities (Task, Profile, Setting)
      // We take the latest state. 
      // Note: If there's a 'create' followed by 'update', it could be simplified to a single 'create' with final payload.
      // If there's 'update' followed by 'delete', it becomes just 'delete'.
      
      const lastEvent = group[group.length - 1];
      const firstEvent = group[0];
      
      let finalAction = lastEvent.action;
      if (firstEvent.action === 'create' && lastEvent.action !== 'delete') {
        finalAction = 'create';
      }

      result.push({
        ...lastEvent,
        action: finalAction,
        // deviceSequence should be the highest one in the group to maintain server-side order correctly if needed,
        // but here we use the latest event's sequence as it's the one that effectively supersedes others.
      });
    }

    return result.sort((a, b) => a.deviceSequence - b.deviceSequence);
  }
}

export const syncOutbox = new SyncOutbox();
