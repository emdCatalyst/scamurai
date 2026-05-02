import { getResend } from "@/lib/resend";

const DEV_FALLBACK = process.env.RESEND_DEV_FALLBACK_EMAIL;
const DEFAULT_FROM =
  process.env.RESEND_FROM_ADDRESS ?? "Scamurai <onboarding@resend.dev>";

type ResendSendParams = Parameters<
  ReturnType<typeof getResend>["emails"]["send"]
>[0];

// Public API: `from` is optional — wrapper injects DEFAULT_FROM when omitted.
type SendEmailParams = Omit<ResendSendParams, "from"> & { from?: string };

/**
 * Sends an email via Resend.
 *
 * The sender address defaults to RESEND_FROM_ADDRESS — set this to your
 * verified domain in production (e.g. "Scamurai <noreply@yourdomain.com>").
 * Until set, falls back to Resend's shared sandbox sender.
 *
 * In dev (when RESEND_DEV_FALLBACK_EMAIL is set), the recipient is rerouted to
 * that single address and the original recipient is preserved in the subject and
 * a banner at the top of the body. This lets you test multi-account flows
 * against Resend's sandbox without verifying a domain.
 *
 * In production (RESEND_DEV_FALLBACK_EMAIL unset), behaves as a thin pass-through.
 */
export async function sendEmail(params: SendEmailParams) {
  const resend = getResend();
  const withFrom = { ...params, from: params.from || DEFAULT_FROM } as ResendSendParams;

  if (!DEV_FALLBACK) {
    return resend.emails.send(withFrom);
  }

  // Use the from-defaulted version inside the dev redirect path too.
  const baseParams = withFrom;

  const originalTo = Array.isArray(baseParams.to)
    ? baseParams.to.join(", ")
    : baseParams.to ?? "";
  const banner = `<div style="background:#fff8c5;border:1px solid #d4a72c;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-family:ui-monospace,monospace;font-size:13px;color:#3d2e00"><strong>DEV SANDBOX</strong> — original recipient: <code>${escapeHtml(originalTo)}</code></div>`;
  const textBanner = `[DEV SANDBOX — original recipient: ${originalTo}]\n\n`;

  const overrides: Record<string, unknown> = {
    to: DEV_FALLBACK,
    subject: `[→ ${originalTo}] ${baseParams.subject}`,
  };
  if ("html" in baseParams && baseParams.html) {
    overrides.html = banner + baseParams.html;
  }
  if ("text" in baseParams && baseParams.text) {
    overrides.text = textBanner + baseParams.text;
  }

  return resend.emails.send({ ...baseParams, ...overrides } as ResendSendParams);
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c] || c)
  );
}
