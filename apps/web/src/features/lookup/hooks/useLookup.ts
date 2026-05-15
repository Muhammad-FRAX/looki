import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client.js';
import type { LookupResponse } from '../../../api/types.js';

export function useLookup() {
  return useMutation({
    mutationFn: (number: string) =>
      apiClient
        .get<LookupResponse>('/lookup', { params: { number } })
        .then((r) => r.data),
  });
}
