import { cn } from '@/lib/cn';

/**
 * Surface shared by the apply form, its loading skeleton and the success
 * view, so swapping one for another never changes the frame around it.
 */
export default function ApplyCard({ className, children, ...rest }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/10 bg-charcoal p-5 sm:p-8 lg:p-10',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
