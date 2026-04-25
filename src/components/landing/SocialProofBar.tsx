'use client';

import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

const brands = ['Jahez · جاهز', 'HungerStation · هنقرستيشن', 'Talabat · طلبات', 'Noon Food · نون فود', 'ToYou · طلبلي', 'Mrsool · مرسول'];

export default function SocialProofBar() {
  const t = useTranslations('socialProof');
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-navy/40 backdrop-blur-sm py-5">
      {/* Glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky/10 to-transparent" />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-6 sm:flex-row sm:justify-between">
        {/* Text */}
        <p className={`shrink-0 text-xs font-medium uppercase tracking-widest text-white/35 ${isAr ? 'font-arabic' : ''}`}>
          {t('trusted')}
        </p>

        {/* Separator */}
        <div className="hidden h-4 w-px bg-white/10 sm:block shrink-0" />

        {/* Marquee */}
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div
            className="flex w-max gap-10"
            style={{ animation: 'marquee 28s linear infinite' }}
          >
            {[...brands, ...brands].map((name, i) => (
              <span
                key={i}
                className={`whitespace-nowrap text-xs font-semibold tracking-widest uppercase text-white/20 ${isAr ? 'font-arabic' : ''}`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Vision 2030 */}
        <div className="hidden shrink-0 lg:flex items-center gap-3 border-s border-white/10 ps-6">
          <Image
            src="/logos/scamurai x 2030 saudi vision.svg"
            alt="Saudi Vision 2030"
            width={64}
            height={32}
            className="opacity-30"
          />
        </div>
      </div>
    </section>
  );
}
