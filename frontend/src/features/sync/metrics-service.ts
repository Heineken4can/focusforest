import { db, type MetricsEvent } from '@/lib/db/db';
import { apiFetch } from '../../lib/api/client';
import { SYNC_CONSTANTS } from '../../lib/constants/sync';

export class MetricsService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;

  async track(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const event: MetricsEvent = {
      eventType,
      payload,
      occurredAt: new Date().toISOString(),
    };

    const store = await db.getStore('metrics_queue', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Attempt to flush if online
    if (navigator.onLine) {
      this.flush().catch(() => { /* error handled in flush */ });
    }
  }

  async flush(): Promise<void> {
    if (!navigator.onLine) return;

    const store = await db.getStore('metrics_queue');
    const events = await new Promise<MetricsEvent[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (events.length === 0) return;

    try {
      await apiFetch('/metrics/events', {
        method: 'POST',
        body: JSON.stringify({ events }),
      });

      // Clear events
      const writeStore = await db.getStore('metrics_queue', 'readwrite');
      for (const event of events) {
        if (event.id) {
          writeStore.delete(event.id);
        }
      }
    } catch (error) {
      // Metrics errors are often non-critical for users, 
      // but we could set an internal error flag if needed.
    }
  }

  initAutoFlush() {
    this.destroy();

    this.onlineHandler = () => {
      this.flush().catch(() => {});
    };
    window.addEventListener('online', this.onlineHandler);

    this.intervalId = setInterval(() => {
      this.flush().catch(() => {});
    }, SYNC_CONSTANTS.AUTO_FLUSH_METRICS_INTERVAL_MS);
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

export const metricsService = new MetricsService();
