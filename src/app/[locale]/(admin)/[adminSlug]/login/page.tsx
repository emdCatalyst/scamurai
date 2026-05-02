'use client';

import { useEffect, useState } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { verifyAdminRole } from './actions';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const { client, setActive, signOut } = useClerk();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const adminSlug = params.adminSlug as string;
  const locale = params.locale as string;
  const t = useTranslations('admin.login');
  const isAr = locale === 'ar';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Smart redirect: if already logged in as master_admin, skip login page
  useEffect(() => {
    if (isUserLoaded && clerkUser) {
      const role = clerkUser.publicMetadata?.role;
      if (role === 'master_admin') {
        router.replace(`/${locale}/${adminSlug}/dashboard`);
      }
    }
  }, [clerkUser, isUserLoaded, locale, adminSlug, router]);

  const onSubmit = async (data: LoginFormValues) => {
    if (!client) return;

    setIsLoading(true);
    setAuthError('');

    try {
      const result = await client.signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });

        // Verify role via server action
        const verification = await verifyAdminRole();
        if (verification.success) {
          router.push(`/${locale}/${adminSlug}/dashboard`);
        } else {
          await signOut();
          setAuthError(verification.error || t('accessDenied'));
        }
      } else {
        console.error(result);
        setAuthError(t('incomplete'));
      }
    } catch (err: any) {
      console.error(err);
      const clerkErrorCode = err.errors?.[0]?.code as string;

      // Try to map Clerk error code to translations, fallback to general invalid
      if (clerkErrorCode && t.has(`errors.${clerkErrorCode}`)) {
        setAuthError(t(`errors.${clerkErrorCode}`));
      } else {
        setAuthError(t('invalid'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero p-6 ${isAr ? 'font-arabic' : 'font-sans'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px] bg-gradient-sky-radial animate-hero-glow-pulse" 
        />
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-[24px] border border-white/10 rounded-2xl p-8 shadow-card"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative w-32 h-32 mb-2"
          >
            <Image
              src="/logos/secondy logo 2.svg"
              alt="Scamurai"
              fill
              className="object-contain"
              priority
            />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-sky text-xs font-bold tracking-widest ${isAr ? 'uppercase' : 'uppercase'}`}
          >
            {t('title')}
          </motion.h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <input
              type="email"
              {...register('email')}
              placeholder={t('emailPlaceholder')}
              disabled={isLoading}
              className={`w-full bg-white/5 border ${errors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-white/10 focus:border-sky/50 focus:ring-sky/50'} rounded-lg px-4 py-3 text-offwhite placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50`}
            />
            {errors.email?.message && (
              <p className="text-red-400 text-xs mt-1.5 ml-1">{t(errors.email.message as any)}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder={t('passwordPlaceholder')}
                disabled={isLoading}
                className={`w-full bg-white/5 border ${errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-white/10 focus:border-sky/50 focus:ring-sky/50'} rounded-lg px-4 py-3 text-offwhite placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className={`absolute top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors disabled:opacity-50 ${isAr ? 'left-4' : 'right-4'}`}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
            {errors.password?.message && (
              <p className="text-red-400 text-xs mt-1.5 ml-1">{t(errors.password.message as any)}</p>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            
            type="submit"
            disabled={isLoading}
            className="w-full relative flex justify-center items-center h-12 bg-gradient-cta rounded-lg text-navy font-bold shadow-glow-sky hover:shadow-glow-lg active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >

            {isLoading ? <Loader2 className="animate-spin" size={20} /> : ( <div className="flex items-center gap-2">
            <LogIn size={18} className={isAr ? "rotate-180" : ""} />
            {t('signIn')}
          </div>)}
          </motion.button>

          {authError && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center mt-4 bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20"
            >
              {authError}
            </motion.p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
