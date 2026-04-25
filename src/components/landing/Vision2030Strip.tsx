import Image from 'next/image';

export default function Vision2030Strip() {
  return (
    <div className="relative overflow-hidden border-y border-navy/10 bg-offwhite py-5">
      {/* Subtle gradient accents */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute start-1/4 top-1/2 -translate-y-1/2 h-24 w-64 rounded-full blur-2xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(79,197,223,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute end-1/4 top-1/2 -translate-y-1/2 h-24 w-64 rounded-full blur-2xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(92,191,143,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-6 px-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-navy/10" />
        <Image
          src="/logos/scamurai x 2030 saudi vision.svg"
          alt="Scamurai × Saudi Vision 2030"
          width={160}
          height={64}
          className="opacity-60 shrink-0"
        />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-navy/10" />
      </div>
    </div>
  );
}
