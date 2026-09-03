import crypto from 'crypto';

export const SERVER_BOOT_ID = crypto.randomBytes(16).toString('hex');
export const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
export const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours