import { getResend } from "@/lib/resend";

const DEV_FALLBACK = process.env.RESEND_DEV_FALLBACK_EMAIL;

type ResendSendParams = Parameters<
  ReturnType<typeof getResend>["emails"]["send"]
>[0];

/**
 * Sends an email via Resend.
 *
 * In dev (when RESEND_DEV_FALLBACK_EMAIL is set), the recipient is rerouted to
 * that single address and the original recipient is preserved in the subject and
 * a banner at the top of the body. This lets you test multi-account flows
 * against Resend's sandbox without verifying a domain.
 *
 * In production (env var unset), behaves as a thin pass-through.
 */
export async function sendEmail(params: ResendSendParams) {
  const resend = getResend();

  if (!DEV_FALLBACK) {
    return resend.emails.send(params);
  }

  const originalTo = Array.isArray(params.to)
    ? params.to.join(", ")
    : params.to ?? "";
  const banner = `<div style="background:#fff8c5;border:1px solid #d4a72c;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-family:ui-monospace,monospace;font-size:13px;color:#3d2e00"><strong>DEV SANDBOX</strong> — original recipient: <code>${escapeHtml(originalTo)}</code></div>`;
  const textBanner = `[DEV SANDBOX — original recipient: ${originalTo}]\n\n`;

  const overrides: Record<string, unknown> = {
    to: DEV_FALLBACK,
    subject: `[→ ${originalTo}] ${params.subject}`,
  };
  if ("html" in params && params.html) {
    overrides.html = banner + params.html;
  }
  if ("text" in params && params.text) {
    overrides.text = textBanner + params.text;
  }

  return resend.emails.send({ ...params, ...overrides } as ResendSendParams);
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
