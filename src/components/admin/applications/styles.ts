/**
 * Shared class lists for the applications admin UI (light theme, slate
 * palette). Written out in full so Tailwind's scanner picks them up.
 */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

export const PRIMARY_BUTTON = `${BUTTON_BASE} bg-navy text-white hover:bg-slate-800 shadow-lg shadow-navy/20 focus-visible:ring-sky-500`;

export const SECONDARY_BUTTON = `${BUTTON_BASE} bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-sky-500`;

export const DANGER_BUTTON = `${BUTTON_BASE} bg-red-600 text-white hover:bg-red-700 shadow-sm focus-visible:ring-red-500`;

export const DANGER_OUTLINE_BUTTON = `${BUTTON_BASE} bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-700 focus-visible:ring-red-500`;

export const FIELD_LABEL = 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5';

export const TEXT_INPUT =
  'w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500';

export const TEXT_INPUT_VALID = 'border-slate-300';
export const TEXT_INPUT_INVALID = 'border-red-500';

export const FIELD_HINT = 'mt-1.5 text-xs text-slate-500';
export const FIELD_ERROR = 'mt-1.5 text-xs font-medium text-red-700';
