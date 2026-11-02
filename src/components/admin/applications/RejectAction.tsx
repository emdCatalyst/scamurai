'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReviewStepProps } from './actionResult';
import RejectPanel from './RejectPanel';
import { DANGER_OUTLINE_BUTTON } from './styles';

/** "Reject" button that expands into the reason form. */
export default function RejectAction(props: ReviewStepProps) {
  const t = useTranslations('admin.applications.reject');
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (isOpen) {
    return (
      <RejectPanel
        {...props}
        onCancel={() => {
          setIsOpen(false);
          // Give focus back to the button once it is rendered again.
          requestAnimationFrame(() => buttonRef.current?.focus());
        }}
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => setIsOpen(true)}
      className={cn(DANGER_OUTLINE_BUTTON, 'w-full')}
    >
      <XCircle size={18} aria-hidden="true" />
      {t('action')}
    </button>
  );
}
