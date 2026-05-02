"use client";

import { useState } from "react";
import { useUser, useReverification } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { useRouter, useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { clearMustChangePassword } from "@/actions/brand/clearMustChangePassword";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validations/changePassword";
import { cn } from "@/lib/utils";

type ClerkErrorShape = {
  errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
};

export default function ChangePasswordPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const t = useTranslations("brand.changePassword");
  const locale = useLocale();
  const isAr = locale === "ar";

  const brandSlug = params.brandSlug as string;

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const translateKey = (key: string | undefined) =>
    key ? t(key as Parameters<typeof t>[0]) : undefined;

  // Wrap updatePassword with reverification — Clerk treats password changes as a
  // high-assurance operation and may pop a verification modal even on a fresh session.
  // The hook handles the modal automatically and retries the call on success.
  const updatePasswordReverified = useReverification(
    async (params: {
      currentPassword: string;
      newPassword: string;
      signOutOfOtherSessions: boolean;
    }) => {
      if (!user) throw new Error("Not signed in");
      return user.updatePassword(params);
    }
  );

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setServerError("");
    if (!user) {
      setServerError(t("errors.notAuthenticated"));
      return;
    }

    try {
      await updatePasswordReverified({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        signOutOfOtherSessions: true,
      });

      const res = await clearMustChangePassword();
      if (!res.success) {
        setServerError(t("errors.metadata"));
        return;
      }

      toast(t("successToast"), "success");

      const role = user.publicMetadata.role as string | undefined;
      const dest =
        role === "finance"
          ? `/${locale}/brands/${brandSlug}/orders`
          : role === "staff"
            ? `/${locale}/brands/${brandSlug}/submit`
            : `/${locale}/brands/${brandSlug}/dashboard`;
      router.push(dest);
    } catch (err) {
      if (isReverificationCancelledError(err)) {
        setServerError(t("errors.reverificationCancelled"));
        return;
      }

      const clerkErr = err as ClerkErrorShape;
      const code = clerkErr.errors?.[0]?.code;
      const longMessage = clerkErr.errors?.[0]?.longMessage;

      switch (code) {
        case "form_password_incorrect":
          setServerError(t("errors.currentIncorrect"));
          break;
        case "form_password_pwned":
          setServerError(t("errors.pwned"));
          break;
        case "form_password_validation_failed":
        case "form_password_size_in_bytes_exceeded":
        case "form_param_format_invalid":
          setServerError(t("errors.validation"));
          break;
        default:
          setServerError(longMessage || t("errors.generic"));
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brand-background)]">
        <Loader2
          className="animate-spin text-[var(--brand-primary)]"
          size={32}
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={cn(
        "min-h-screen bg-[var(--brand-background)] flex items-center justify-center p-4 relative overflow-hidden",
        isAr ? "font-arabic" : "font-sans"
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-72 pointer-events-none opacity-30"
        style={{
          background:
            "linear-gradient(to bottom, var(--brand-primary) 0%, transparent 100%)",
        }}
      />

      <div className="relative max-w-md w-full bg-[var(--brand-surface)] rounded-3xl p-8 shadow-2xl border border-[var(--brand-border)]">
        <div className="w-16 h-16 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-bold text-center text-[var(--brand-surface-fg)] mb-2">
          {t("title")}
        </h1>
        <p className="text-center text-sm text-[var(--brand-surface-fg-muted)] mb-8">
          {t("subtitle")}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <PasswordField
            label={t("currentPassword")}
            register={register("currentPassword")}
            error={translateKey(errors.currentPassword?.message)}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            disabled={isSubmitting}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            autoComplete="current-password"
          />
          <PasswordField
            label={t("newPassword")}
            register={register("newPassword")}
            error={translateKey(errors.newPassword?.message)}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            disabled={isSubmitting}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            autoComplete="new-password"
          />
          <PasswordField
            label={t("confirmPassword")}
            register={register("confirmPassword")}
            error={translateKey(errors.confirmPassword?.message)}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            disabled={isSubmitting}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            autoComplete="new-password"
          />

          {serverError && (
            <div className="text-[var(--brand-danger)] text-sm bg-[var(--brand-danger)]/10 border border-[var(--brand-danger)]/20 py-2.5 px-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="shrink-0 mt-0.5" size={16} />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
                <span>{t("submitting")}</span>
              </>
            ) : (
              t("submit")
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  show: boolean;
  onToggleShow: () => void;
  disabled: boolean;
  showLabel: string;
  hideLabel: string;
  autoComplete: "current-password" | "new-password";
}

function PasswordField({
  label,
  register,
  error,
  show,
  onToggleShow,
  disabled,
  showLabel,
  hideLabel,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-[var(--brand-surface-fg)] uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="absolute top-1/2 -translate-y-1/2 start-4 text-[var(--brand-surface-fg-muted)]"
          size={18}
          strokeWidth={1.5}
        />
        <input
          {...register}
          type={show ? "text" : "password"}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full ps-11 pe-11 py-3 bg-[var(--brand-surface-fg)]/5 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm font-medium text-[var(--brand-surface-fg)] disabled:opacity-50",
            error
              ? "border-[var(--brand-danger)]/40 focus:ring-[var(--brand-danger)]/20 focus:border-[var(--brand-danger)]"
              : "border-[var(--brand-border)] focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={show ? hideLabel : showLabel}
          className="absolute top-1/2 -translate-y-1/2 end-4 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-50"
        >
          {show ? (
            <EyeOff size={18} strokeWidth={1.5} />
          ) : (
            <Eye size={18} strokeWidth={1.5} />
          )}
        </button>
      </div>
      {error && (
        <p className="text-[var(--brand-danger)] text-xs mt-1.5 ms-1 flex items-start gap-1">
          <AlertCircle size={12} className="shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
