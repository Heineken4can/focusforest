import { apiFetch, ApiRequestError, type ApiRequestOptions } from '../../lib/api/client';
import { syncOutbox } from './sync-outbox';
import { type EntityType } from '../../lib/db/db';

export async function syncApiFetch<TData>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
  syncOptions?: {
    entityType: EntityType;
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'transition';
  }
): Promise<TData> {
  const isMutable = init.method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(init.method);

  if (isMutable && syncOptions && !navigator.onLine) {
    // 1. Add to outbox
    await syncOutbox.addEvent({
      entityType: syncOptions.entityType,
      entityId: syncOptions.entityId,
      action: syncOptions.action,
      payload: JSON.parse(init.body as string),
    });

    // 2. Return a placeholder or throw a specific "queued" error?
    // Let's return a "fake" success if it's a mutation to avoid UI errors.
    // However, the caller might need the real data.
    // In local-first, the UI should already have updated the local DB, 
    // so it doesn't strictly need the server response immediately.
    return { status: 'queued', message: 'Offline, queued to outbox' } as unknown as TData;
  }

  try {
    return await apiFetch<TData>(path, init, options);
  } catch (error) {
    if (isMutable && syncOptions && error instanceof ApiRequestError && error.status === 0) {
      // Network error (offline during request)
      await syncOutbox.addEvent({
        entityType: syncOptions.entityType,
        entityId: syncOptions.entityId,
        action: syncOptions.action,
        payload: JSON.parse(init.body as string),
      });
      return { status: 'queued', message: 'Network error, queued to outbox' } as unknown as TData;
    }
    throw error;
  }
}
