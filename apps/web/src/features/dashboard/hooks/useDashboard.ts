import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '../../../api/client.js';
import type { UsageEntry, ApiKey } from '../../../api/types.js';

export function useUsage() {
  const from = dayjs().subtract(29, 'day').format('YYYY-MM-DD');
  const to = dayjs().format('YYYY-MM-DD');

  return useQuery({
    queryKey: ['usage', from, to],
    queryFn: () =>
      apiClient
        .get<{ usage: UsageEntry[] }>('/me/usage', { params: { from, to } })
        .then((r) => r.data.usage),
    staleTime: 2 * 60 * 1000,
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: () =>
      apiClient
        .get<{ keys: ApiKey[] }>('/me/keys')
        .then((r) => r.data.keys),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient
        .post<{ key: ApiKey & { plaintext: string } }>('/me/keys', { name })
        .then((r) => r.data.key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });
}

export function useRevokeKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/me/keys/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });
}
