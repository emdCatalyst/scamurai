import { Resend } from 'resend';

/**
 * Resend email client. Server-only.
 * Lazily initialized to avoid build-time errors when env vars are missing.
 */
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('Missing RESEND_API_KEY env var');
    }
    _resend = new Resend(key);
  }
  return _resend;
}
