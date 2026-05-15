// Express Request augmentation for auth + request tracking
declare namespace Express {
  interface Request {
    requestId?: string;
    apiKey?: {
      id: string;
      user_id: string;
      tier: string;
    };
    user?: {
      id: string;
      role: string;
    };
  }
}
