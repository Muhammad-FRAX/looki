import { useMutation } from '@tanstack/react-query';
import { lookupClient } from '../../../api/lookupClient.js';
import type { LookupResponse } from '../../../api/types.js';

export function useLookup() {
  return useMutation({
    mutationFn: (number: string) =>
      lookupClient
        .get<LookupResponse>('/lookup', { params: { number } })
        .then((r) => r.data),
  });
}
