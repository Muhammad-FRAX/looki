import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client.js';
import type { AdminStats, AdminUser } from '../../../api/types.js';

export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: () =>
      apiClient
        .get<{ stats: AdminStats }>('/admin/stats')
        .then((r) => r.data.stats),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useAdminUsers(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['adminUsers', page, pageSize],
    queryFn: () =>
      apiClient
        .get<{ users: AdminUser[]; pagination: { total: number } }>('/admin/users', {
          params: { page, limit: pageSize },
        })
        .then((r) => ({ users: r.data.users, total: r.data.pagination.total })),
    staleTime: 30 * 1000,
  });
}

export function useDataReload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post('/admin/data/reload').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}
