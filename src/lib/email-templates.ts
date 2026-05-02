/**
 * Unified email template system for Scamurai.
 *
 * All transactional emails should be composed via `renderEmail()` so they share
 * the same logo header, typography, and contact-details footer. Use the helper
 * functions (`emailHeading`, `emailParagraph`, `emailButton`, `emailCallout`,
 * `emailKeyValue`, `emailDivider`, `emailMutedNote`) to assemble the body —
 * they handle HTML escaping and email-client-safe inline styling for you.
 *
 * Edit the COMPANY constants below to update the footer everywhere at once.
 */

const COMPANY = {
  name: "Scamurai",
  tagline: "The Smart Order Verification Platform",
  supportEmail: "support@scamurai.com",
  websiteUrl: (
    process.env.NEXT_PUBLIC_APP_URL || "https://scamurai.com"
  ).replace(/\/$/, ""),
};

const COLORS = {
  navy: "#172b49",
  sky: "#4fc5df",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
  surface: "#ffffff",
  background: "#f8fafc",
  callout: "#f1f5f9",
} as const;

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type Dir = "ltr" | "rtl";

export function escapeHtml(input: string): string {
  return input.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] || c
  );
}

const align = (dir: Dir) => (dir === "rtl" ? "right" : "left");

interface EmailLayoutOptions {
  /** Hidden preview text shown in the inbox list before the user opens the email. */
  preheader?: string;
  /** Pre-rendered email body HTML (build with the helper functions below). */
  bodyHtml: string;
  /** Document direction. The header and footer follow this direction. */
  dir?: Dir;
  /** ISO language code for the <html> tag. */
  lang?: string;
}

export function renderEmail({
  preheader,
  bodyHtml,
  dir = "ltr",
  lang = "en",
}: EmailLayoutOptions): string {
  const safePreheader = preheader ? escapeHtml(preheader) : "";
  const websiteDisplay = COMPANY.websiteUrl.replace(/^https?:\/\//, "");
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${COMPANY.name}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:${FONT_STACK};color:${COLORS.text};">
  ${
    safePreheader
      ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${safePreheader}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${COLORS.surface};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 1px 2px rgba(15,23,42,0.04);">

          <!-- Header -->
          <tr>
            <td style="background-color:${COLORS.navy};padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align:${align(dir)};">
                    <img
                      src="${COMPANY.websiteUrl}/logos/primary%20logo%202.svg"
                      alt="${COMPANY.name}"
                      width="160"
                      height="46"
                      style="display:inline-block;width:160px;height:46px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;line-height:46px;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;color:${COLORS.text};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${COLORS.callout};padding:24px 32px;border-top:1px solid ${COLORS.border};text-align:${align(dir)};">
              <p style="margin:0 0 8px;font-size:13px;color:${COLORS.muted};line-height:1.6;">
                <strong style="color:${COLORS.navy};">${COMPANY.name}</strong> &middot; ${COMPANY.tagline}
              </p>
              <p style="margin:0 0 12px;font-size:13px;color:${COLORS.muted};line-height:1.6;">
                <a href="mailto:${COMPANY.supportEmail}" style="color:${COLORS.sky};text-decoration:none;">${COMPANY.supportEmail}</a>
                &nbsp;&middot;&nbsp;
                <a href="${COMPANY.websiteUrl}" style="color:${COLORS.sky};text-decoration:none;">${websiteDisplay}</a>
              </p>
              <p style="margin:0;font-size:11px;color:${COLORS.muted};line-height:1.5;">
                &copy; ${year} ${COMPANY.name}. This is a system-generated email &mdash; please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeading(text: string, dir: Dir = "ltr"): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${COLORS.navy};line-height:1.3;text-align:${align(dir)};">${escapeHtml(text)}</h1>`;
}

export function emailParagraph(text: string, dir: Dir = "ltr"): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.text};text-align:${align(dir)};">${escapeHtml(text)}</p>`;
}

/**
 * Renders a paragraph that contains a single bold-highlighted span.
 * Both `before`, `highlight`, and `after` are HTML-escaped.
 */
export function emailParagraphWithHighlight({
  before,
  highlight,
  after,
  dir = "ltr",
}: {
  before: string;
  highlight: string;
  after: string;
  dir?: Dir;
}): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.text};text-align:${align(dir)};">${escapeHtml(before)}<strong style="color:${COLORS.navy};">${escapeHtml(highlight)}</strong>${escapeHtml(after)}</p>`;
}

export function emailButton(href: string, label: string, dir: Dir = "ltr"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;${dir === "rtl" ? "margin-right:0;" : "margin-left:0;"}">
    <tr>
      <td style="border-radius:8px;background-color:${COLORS.sky};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;font-family:${FONT_STACK};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function emailCallout(label: string, value: string, dir: Dir = "ltr"): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background-color:${COLORS.callout};border-radius:8px;border:1px solid ${COLORS.border};">
    <tr>
      <td style="padding:18px 22px;text-align:${align(dir)};">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.muted};margin-bottom:8px;">${escapeHtml(label)}</div>
        <div style="font-size:18px;font-weight:700;color:${COLORS.navy};font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;letter-spacing:1px;word-break:break-all;">${escapeHtml(value)}</div>
      </td>
    </tr>
  </table>`;
}

export function emailKeyValue(rows: Array<{ key: string; value: string }>, dir: Dir = "ltr"): string {
  const trs = rows
    .map(
      ({ key, value }) =>
        `<tr>
          <td style="padding:12px 0;font-size:12px;font-weight:700;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.5px;width:38%;vertical-align:top;text-align:${align(dir)};">${escapeHtml(key)}</td>
          <td style="padding:12px 0;font-size:14px;color:${COLORS.text};vertical-align:top;text-align:${align(dir)};">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORS.border};border-bottom:1px solid ${COLORS.border};margin:16px 0;">${trs}</table>`;
}

export function emailDivider(): string {
  return `<hr style="border:0;border-top:1px solid ${COLORS.border};margin:28px 0;">`;
}

export function emailMutedNote(text: string, dir: Dir = "ltr"): string {
  return `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${COLORS.border};font-size:13px;color:${COLORS.muted};line-height:1.6;text-align:${align(dir)};">${escapeHtml(text)}</p>`;
}
