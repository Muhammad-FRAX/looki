import { useState } from 'react';
import { apiClient } from '../../../api/client';
import type { LookupResponse } from '../../../api/types';

export function useLookup() {
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup(number: string, country?: string) {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<LookupResponse>('/lookup', {
        params: { number, ...(country ? { country } : {}) },
      });
      setResult(data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { status?: number } };
        if (axErr.response?.status === 429) {
          setError('Rate limit exceeded. Please wait before trying again.');
          return;
        }
      }
      setError('Lookup failed. Check the number format (E.164 e.g. +12125550123).');
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, lookup };
}
