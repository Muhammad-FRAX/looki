import type { DataSource } from '../types.js';

export const acmaSource: DataSource = {
  name: 'ACMA',
  countryCode: 'AU',
  minRows: 0,
  load: async () => {
    console.log('[data-loader] [ACMA] Stub — Australian number data not yet implemented');
    return [];
  },
};
