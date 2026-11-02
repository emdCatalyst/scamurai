'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalDrawerOptions {
  panelRef: RefObject<HTMLElement | null>;
  /** Receives focus when the drawer opens. */
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * Modal dialog keyboard behaviour: focus moves in on open and back to the
 * opener on close, Tab cycles inside the panel, Escape closes it.
 */
export function useModalDrawer({ panelRef, initialFocusRef, onClose }: ModalDrawerOptions) {
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    initialFocusRef.current?.focus();
    return () => opener?.focus();
  }, [initialFocusRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, panelRef]);
}
