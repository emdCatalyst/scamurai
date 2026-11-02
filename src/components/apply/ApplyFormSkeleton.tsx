import ApplyCard from './ApplyCard';

/** Three progress steps and three service options, like the form's first step. */
const PLACEHOLDERS = [0, 1, 2];

/**
 * Suspense fallback for the apply form. The form reads the query string
 * (`useSearchParams`), so on the static page it renders in the browser; this
 * placeholder mirrors its first step so the swap barely moves the layout.
 */
export default function ApplyFormSkeleton({ label }: { label: string }) {
  return (
    <ApplyCard role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="flex items-center gap-3">
          {PLACEHOLDERS.map((row) => (
            <div key={row} className="flex flex-1 items-center gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
              <div className="h-px flex-1 bg-white/10" />
            </div>
          ))}
        </div>
        <div className="mt-8 h-3 w-24 rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-2/3 rounded-lg bg-white/10" />
        <div className="mt-4 h-4 w-1/2 rounded-full bg-white/[0.06]" />
        <div className="mt-6 grid gap-3">
          {PLACEHOLDERS.map((row) => (
            <div key={row} className="h-[7.5rem] rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
        <div className="mt-8 flex justify-end border-t border-white/[0.06] pt-6">
          <div className="h-11 w-full rounded-full bg-white/10 sm:w-36" />
        </div>
      </div>
    </ApplyCard>
  );
}
