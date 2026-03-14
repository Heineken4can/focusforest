export type EntityType = 'task' | 'profile' | 'setting' | 'focus-session';

export interface SyncOutboxEvent {
  deviceSequence: number;
  entityType: EntityType;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'transition';
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface MetricsEvent {
  id?: number;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

const DB_NAME = 'focus-forest-db';
const DB_VERSION = 1;

export class AppDatabase {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Tasks Store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('clientGeneratedId', 'clientGeneratedId', { unique: true });
        }

        // Focus Sessions Store
        if (!db.objectStoreNames.contains('focus_sessions')) {
          const sessionStore = db.createObjectStore('focus_sessions', { keyPath: 'id' });
          sessionStore.createIndex('taskId', 'taskId', { unique: false });
        }

        // Sync Outbox Store
        if (!db.objectStoreNames.contains('sync_outbox')) {
          db.createObjectStore('sync_outbox', { keyPath: 'deviceSequence' });
        }

        // Metrics Queue Store
        if (!db.objectStoreNames.contains('metrics_queue')) {
          db.createObjectStore('metrics_queue', { keyPath: 'id', autoIncrement: true });
        }

        // Metadata Store
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.open();
    const transaction = db.transaction(name, mode);
    return transaction.objectStore(name);
  }

  async putMetadata(key: string, value: unknown): Promise<void> {
    const store = await this.getStore('sync_metadata', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    const store = await this.getStore('sync_metadata');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async nextDeviceSequence(): Promise<number> {
    const key = 'device_sequence';
    const current = (await this.getMetadata<number>(key)) || 0;
    const next = current + 1;
    await this.putMetadata(key, next);
    return next;
  }
}

export const db = new AppDatabase();
