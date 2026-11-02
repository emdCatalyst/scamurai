import { Info } from 'lucide-react';

/** Small centred disclaimer under a section that describes planned (not yet live) scope. */
export default function PlannedNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-10 flex max-w-2xl items-start justify-center gap-2 text-center text-sm leading-relaxed text-white/65">
      <Info aria-hidden="true" focusable="false" size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}
