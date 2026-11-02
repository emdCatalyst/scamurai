'use client';

import { useId, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

const ICON_BUTTON =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60';

interface MobileMenuProps {
  /** Accessible name of the drawer. */
  label: string;
  openLabel: string;
  closeLabel: string;
  /** Shown at the top of the drawer, beside the close button (e.g. the logo). */
  header?: React.ReactNode;
  /** Drawer body: links and actions, rendered on the server. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Small-screen navigation drawer on top of the native modal <dialog>, which
 * already traps focus, makes the page behind it inert, closes on Escape and
 * draws the overlay (::backdrop). This island adds only what the platform
 * lacks: closing on overlay clicks and link activation, and handing focus back
 * to the trigger. The slide-in and the page scroll lock are CSS (`.nav-drawer`
 * in globals.css).
 */
export default function MobileMenu({ label, openLabel, closeLabel, header, children, className }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  const show = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };

  const hide = () => dialogRef.current?.close();

  // Fires however the dialog closes: hide(), the Escape key or the browser itself.
  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const { target, currentTarget } = event;
    // The panel fills the dialog box, so a click on the dialog itself landed on the overlay.
    const onOverlay = target === currentTarget;
    // Following a link, to another page or to a section of this one, should reveal the destination.
    const onLink = target instanceof Element && target.closest('a') !== null;
    if (onOverlay || onLink) hide();
  };

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-label={openLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={drawerId}
        className={ICON_BUTTON}
      >
        <Menu aria-hidden="true" size={20} strokeWidth={1.75} />
      </button>

      <dialog
        ref={dialogRef}
        id={drawerId}
        aria-label={label}
        onClose={handleClose}
        onClick={handleClick}
        className="nav-drawer fixed inset-y-0 start-auto end-0 m-0 h-auto max-h-none w-80 max-w-[85vw] overflow-hidden border-0 border-s border-white/[0.08] bg-navy/95 p-0 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain p-6">
          <div className="mb-8 flex items-center justify-between gap-4">
            {header}
            <button type="button" onClick={hide} aria-label={closeLabel} className={ICON_BUTTON}>
              <X aria-hidden="true" size={20} strokeWidth={1.75} />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </div>
  );
}
