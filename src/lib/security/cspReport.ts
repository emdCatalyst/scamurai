/**
 * Content-Security-Policy violation reports, as browsers post them to
 * CSP_REPORT_PATH, reduced to what's worth one log line each. Two formats
 * arrive:
 *   - `report-uri`:  {"csp-report": {"blocked-uri": …}}        (application/csp-report)
 *   - Reporting API: [{"type": "csp-violation", "body": {…}}]  (application/reports+json)
 */

export interface CspViolation {
  directive: string;
  blocked: string;
  page?: string;
  source?: string;
  line?: number;
  disposition?: string;
}

/** Per request; a single page load rarely reports more. */
const MAX_REPORTS = 10;
const MAX_FIELD_LENGTH = 300;
/** Browser extensions inject scripts into every page: noise, not our policy. */
const EXTENSION_URL = /^[a-z-]+-extension:/i;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/**
 * URLs keep only origin and path: query strings can hold signed-URL tokens.
 * The secret admin path is masked. Keywords such as "inline" pass through.
 */
function scrub(value: unknown, adminSlug: string | undefined): string | undefined {
  let result = text(value);
  if (!result) return undefined;
  try {
    const url = new URL(result);
    result = url.protocol === 'http:' || url.protocol === 'https:' ? url.origin + url.pathname : url.protocol;
  } catch {
    // Not a URL: a keyword like "inline" or "eval".
  }
  if (adminSlug) result = result.split(adminSlug).join('<admin>');
  return result.slice(0, MAX_FIELD_LENGTH);
}

function fromReportingApi(body: Json): Json {
  return {
    directive: body.effectiveDirective,
    blocked: body.blockedURL,
    page: body.documentURL,
    source: body.sourceFile,
    line: body.lineNumber,
    disposition: body.disposition,
  };
}

function fromReportUri(report: Json): Json {
  return {
    directive: report['effective-directive'] ?? report['violated-directive'],
    blocked: report['blocked-uri'],
    page: report['document-uri'],
    source: report['source-file'],
    line: report['line-number'],
    disposition: report.disposition,
  };
}

export function parseCspReports(payload: unknown, adminSlug?: string): CspViolation[] {
  const reports = Array.isArray(payload)
    ? payload.filter((r) => isRecord(r) && r.type === 'csp-violation' && isRecord(r.body)).map((r) => fromReportingApi(r.body as Json))
    : isRecord(payload) && isRecord(payload['csp-report'])
      ? [fromReportUri(payload['csp-report'])]
      : [];

  return reports
    .filter((r) => !EXTENSION_URL.test(text(r.blocked) ?? '') && !EXTENSION_URL.test(text(r.source) ?? ''))
    .slice(0, MAX_REPORTS)
    .map((r) => ({
      // `violated-directive` may carry the whole directive; the name is enough.
      directive: (text(r.directive) ?? 'unknown').split(' ')[0].slice(0, 60),
      blocked: scrub(r.blocked, adminSlug) ?? 'unknown',
      page: scrub(r.page, adminSlug),
      source: scrub(r.source, adminSlug),
      line: typeof r.line === 'number' ? r.line : undefined,
      disposition: text(r.disposition)?.slice(0, 20),
    }));
}
