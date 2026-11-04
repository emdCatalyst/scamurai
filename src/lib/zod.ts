import { z } from 'zod';

/**
 * Zod, configured for this app: import `z` from here, not from 'zod'
 * (ESLint enforces it).
 *
 * jitless: on its first parse Zod probes `Function("")` to compile faster
 * validators. The Content-Security-Policy forbids eval
 * (src/lib/security/csp.ts), so the probe would only add a violation report
 * on every page with a form.
 */
z.config({ jitless: true });

export { z };
