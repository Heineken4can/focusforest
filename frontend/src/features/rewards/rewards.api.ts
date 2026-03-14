import { apiFetch } from '@/lib/api/client';
import type { GetRewardLedgerResponse, GetRewardStatsResponse } from './rewards.types';

export async function getRewardStats() {
  return apiFetch<GetRewardStatsResponse>('/rewards/stats', {
    method: 'GET',
  }, {
    auth: 'required',
  });
}

export async function getRewardLedger(cursor?: string) {
  const url = cursor ? `/rewards/ledger?cursor=${encodeURIComponent(cursor)}` : '/rewards/ledger';
  return apiFetch<GetRewardLedgerResponse>(url, {
    method: 'GET',
  }, {
    auth: 'required',
  });
}
