'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

/** Scroll distance after which the header gets a solid backdrop so it stays legible over any section. */
const SOLID_AFTER_PX = 60;

function subscribe(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

const isScrolled = () => window.scrollY > SOLID_AFTER_PX;
const isScrolledOnServer = () => false;

/**
 * The fixed header bar. Its only client-side job is to switch from transparent
 * to a blurred navy backdrop once the page scrolls; everything inside it is
 * rendered on the server and passed in as children.
 */
export default function HeaderFrame({ children }: { children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, isScrolledOnServer);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled
          ? 'border-white/[0.06] bg-navy/80 shadow-[0_1px_0_0_rgba(79,197,223,0.08)] backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      )}
    >
      {children}
    </header>
  );
}
