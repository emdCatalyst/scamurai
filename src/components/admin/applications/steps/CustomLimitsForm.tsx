'use client';

import { useId, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ApproveApplicationInput } from '@/actions/approveApplication';
import { cn } from '@/lib/cn';
import { CUSTOM_LIMIT_MAX, customLimitsFormSchema, type CustomLimitsFormValues } from '../reviewRules';
import {
  FIELD_ERROR,
  FIELD_HINT,
  FIELD_LABEL,
  PRIMARY_BUTTON,
  TEXT_INPUT,
  TEXT_INPUT_INVALID,
  TEXT_INPUT_VALID,
} from '../styles';

export type CustomLimits = NonNullable<ApproveApplicationInput['customLimits']>;

interface CustomLimitsFormProps {
  submitLabel: ReactNode;
  disabled: boolean;
  onSubmit: (limits: CustomLimits) => void;
}

/** Negotiated branch and user caps for plans without fixed limits (Enterprise), validated as typed. */
export default function CustomLimitsForm({ submitLabel, disabled, onSubmit }: CustomLimitsFormProps) {
  const t = useTranslations('admin.applications.steps.approved');
  const tErrors = useTranslations('admin.applications.errors');
  const id = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomLimitsFormValues>({ resolver: zodResolver(customLimitsFormSchema), mode: 'onChange' });

  const fields = [
    { name: 'customMaxBranches', label: t('maxBranches') },
    { name: 'customMaxUsers', label: t('maxUsers') },
  ] as const;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({ maxBranches: Number(values.customMaxBranches), maxUsers: Number(values.customMaxUsers) })
      )}
    >
      <fieldset>
        <legend className="text-sm font-bold text-slate-800">{t('customLimitsTitle')}</legend>
        <p className={FIELD_HINT}>{t('customLimitsHint')}</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ name, label }) => {
            const inputId = `${id}-${name}`;
            const errorId = `${inputId}-error`;
            const message = errors[name]?.message;
            return (
              <div key={name}>
                <label htmlFor={inputId} className={FIELD_LABEL}>
                  {label}
                </label>
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={CUSTOM_LIMIT_MAX}
                  step={1}
                  required
                  aria-invalid={message ? true : undefined}
                  aria-describedby={message ? errorId : undefined}
                  className={cn(TEXT_INPUT, message ? TEXT_INPUT_INVALID : TEXT_INPUT_VALID)}
                  {...register(name)}
                />
                {message && (
                  <p id={errorId} role="alert" className={FIELD_ERROR}>
                    {tErrors(message)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" disabled={disabled} className={PRIMARY_BUTTON}>
        {submitLabel}
      </button>
    </form>
  );
}
