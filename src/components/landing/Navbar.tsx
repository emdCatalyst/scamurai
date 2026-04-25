'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchLocale = () => {
    router.replace(pathname, { locale: isAr ? 'en' : 'ar' });
  };

  const links = [
    { label: t('features'), href: '/#how' },
    { label: t('about'), href: '/#about' },
    { label: t('plans'), href: '/#plans' },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${scrolled
          ? 'bg-navy/75 backdrop-blur-xl border-white/[0.06] shadow-[0_1px_0_0_rgba(79,197,223,0.08)]'
          : 'bg-transparent border-white/0'
          }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 group">
            <Image
              src="/logos/secondy logo 2.svg"
              alt="Scamurai"
              width={40}
              height={40}
              className="transition-transform duration-300 group-hover:scale-110"
              priority
            />
 
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href as any}
                className="relative px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white group"
              >
                {link.label}
                <span className="absolute bottom-0 start-4 end-4 h-px bg-gradient-cta scale-x-0 transition-transform duration-200 group-hover:scale-x-100 origin-start" />
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={switchLocale}
              className="flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] h-8 w-8 text-[11px] font-bold text-white/60 transition-all hover:border-sky/40 hover:text-sky"
            >
              {t('langLabel')}
            </button>


            <a
              href="/apply"
              className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-gradient-cta px-5 py-2 text-sm font-semibold text-navy shadow-glow-sky transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{t('getStarted')}</span>
              <ChevronRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={switchLocale}
              className="flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] h-8 w-8 text-[11px] font-bold text-white/60 transition-all hover:border-sky/40 hover:text-sky"
            >
              {t('langLabel')}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/70"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={prefersReduced ? false : { x: isAr ? '-100%' : '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isAr ? '-100%' : '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 end-0 z-50 flex w-72 flex-col bg-navy/95 backdrop-blur-xl border-s border-white/[0.08] p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <Image src="/logos/secondy logo 2.svg" alt="Scamurai" width={32} height={32} />
                <button onClick={() => setMobileOpen(false)} className="text-white/50 hover:text-white">
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-base font-medium text-white/70 transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-3">
                <a
                  href="/apply"
                  className="rounded-xl bg-gradient-cta px-4 py-3 text-center text-sm font-semibold text-navy shadow-glow-sky"
                >
                  {t('getStarted')}
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
