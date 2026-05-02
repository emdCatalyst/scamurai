"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
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
import {
  inviteAcceptSchema,
  type InviteAcceptFormValues,
} from "@/lib/validations/inviteAccept";
import { cn } from "@/lib/utils";

type ClerkErrorShape = {
  errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
};

interface InviteAcceptFormProps {
  ticket: string;
  locale: string;
}

export default function InviteAcceptForm({
  ticket,
  locale,
}: InviteAcceptFormProps) {
  const t = useTranslations("onboarding.invite");
  const { client, setActive } = useClerk();
  const isAr = locale === "ar";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<InviteAcceptFormValues>({
    resolver: zodResolver(inviteAcceptSchema),
    mode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const translateKey = (key: string | undefined) =>
    key ? t(key as Parameters<typeof t>[0]) : undefined;

  const onSubmit = async (data: InviteAcceptFormValues) => {
    setServerError("");
    if (!client) {
      setServerError(t("errors.initializing"));
      return;
    }

    try {
      const result = await client.signUp.create({
        strategy: "ticket",
        ticket,
        password: data.password,
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        setServerError(t("errors.generic"));
        return;
      }

      await setActive({ session: result.createdSessionId });
      // Drop the ticket params and let the now-signed-in flow proceed
      // into the BrandSetup wizard.
      window.location.replace(`/${locale}/onboarding/brand-setup`);
    } catch (err) {
      const clerkErr = err as ClerkErrorShape;
      const code = clerkErr.errors?.[0]?.code;
      const longMessage = clerkErr.errors?.[0]?.longMessage;

      switch (code) {
        case "form_password_pwned":
          setServerError(t("errors.pwned"));
          break;
        case "form_password_validation_failed":
        case "form_password_size_in_bytes_exceeded":
        case "form_param_format_invalid":
          setServerError(t("errors.validation"));
          break;
        case "ticket_expired":
        case "ticket_invalid":
        case "form_param_unknown":
        case "not_allowed_access":
          setServerError(t("errors.ticketInvalid"));
          break;
        default:
          setServerError(longMessage || t("errors.generic"));
      }
    }
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={cn(
        "w-full max-w-md mx-auto",
        isAr ? "font-arabic" : "font-sans"
      )}
    >
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-[#4fc5df]/15 text-[#4fc5df] rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-center text-sm text-white/60 mb-8">
          {t("subtitle")}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <PasswordField
            label={t("newPassword")}
            register={register("password")}
            error={translateKey(errors.password?.message)}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
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
            <div className="text-[#ff7676] text-sm bg-[#ff7676]/10 border border-[#ff7676]/20 py-2.5 px-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="shrink-0 mt-0.5" size={16} />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-[#4fc5df] text-[#0A1628] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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
  autoComplete: "new-password" | "current-password";
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
      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="absolute top-1/2 -translate-y-1/2 start-4 text-white/40"
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
            "w-full ps-11 pe-11 py-3 bg-white/5 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm font-medium text-white placeholder:text-white/40 disabled:opacity-50",
            error
              ? "border-[#ff7676]/40 focus:ring-[#ff7676]/20 focus:border-[#ff7676]"
              : "border-white/10 focus:ring-[#4fc5df]/30 focus:border-[#4fc5df]/50"
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={show ? hideLabel : showLabel}
          className="absolute top-1/2 -translate-y-1/2 end-4 text-white/40 hover:text-white/80 transition-colors disabled:opacity-50"
        >
          {show ? (
            <EyeOff size={18} strokeWidth={1.5} />
          ) : (
            <Eye size={18} strokeWidth={1.5} />
          )}
        </button>
      </div>
      {error && (
        <p className="text-[#ff7676] text-xs mt-1.5 ms-1 flex items-start gap-1">
          <AlertCircle size={12} className="shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
