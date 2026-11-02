import type { ServiceAccent } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '../accents';

/** Decorative blurred light in the service accent. Place inside a `relative` box. */
export default function AccentGlow({ accent, className }: { accent: ServiceAccent; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 flex justify-center', className)}>
      <div
        className={cn(
          'h-72 w-[36rem] max-w-full rounded-full opacity-[0.14] blur-3xl sm:h-[28rem] sm:w-[48rem]',
          ACCENTS[accent].solid
        )}
      />
    </div>
  );
}
