import { cn } from '@/lib/cn';

/**
 * Surface shared by the apply form, its loading skeleton and the success
 * view, so swapping one for another never changes the frame around it.
 */
export default function ApplyCard({ className, children, ...rest }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
