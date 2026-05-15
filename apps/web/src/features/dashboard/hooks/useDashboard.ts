import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiKey, UsageDay } from '../../../api/types';

interface MeUsageResponse {
  usage: UsageDay[];
}

export function useDashboard() {
  const keysQuery = useQuery({
    queryKey: ['keys'],
    queryFn: () => apiClient.get<ApiKey[]>('/me/keys').then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const usageQuery = useQuery({
    queryKey: ['usage'],
    queryFn: () => {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return apiClient.get<MeUsageResponse>('/me/usage', { params: { from, to } }).then(r => r.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalLookups = usageQuery.data?.usage.reduce((s, d) => s + d.count, 0) ?? 0;
  const activeKeys = keysQuery.data?.filter(k => !k.revoked_at).length ?? 0;
  const todayCount = usageQuery.data?.usage[usageQuery.data.usage.length - 1]?.count ?? 0;

  return {
    keys: keysQuery.data ?? [],
    usage: usageQuery.data?.usage ?? [],
    totalLookups,
    activeKeys,
    todayCount,
    loading: keysQuery.isLoading || usageQuery.isLoading,
  };
}
