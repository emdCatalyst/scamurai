import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:     '#172b49',
        sky:      '#4fc5df',
        mint:     '#5cbf8f',
        charcoal: '#282827',
        offwhite: '#f2f2f2',
        'navy-deep': '#0d1e35',
        'sky-dim':   'rgba(79,197,223,0.15)',
        'mint-dim':  'rgba(92,191,143,0.12)',
      },
      fontFamily: {
        sans:   ['var(--font-poppins)', 'sans-serif'],
        arabic: ['var(--font-qomra)',   'sans-serif'],
        mono:   ['var(--font-mono)',    'monospace'],
      },
      backgroundImage: {
        'gradient-hero':      'linear-gradient(135deg, #0d1e35 0%, #172b49 45%, #0e2a3a 100%)',
        'gradient-cta':       'linear-gradient(135deg, #4fc5df 0%, #5cbf8f 100%)',
        'gradient-cta-r':     'linear-gradient(135deg, #5cbf8f 0%, #4fc5df 100%)',
        'gradient-sky-radial':'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(79,197,223,0.18) 0%, transparent 60%)',
        'gradient-shimmer':   'linear-gradient(90deg, transparent 0%, rgba(79,197,223,0.15) 50%, transparent 100%)',
      },
      animation: {
        'float-slow':      'float-slow 6s ease-in-out infinite',
        'spin-slow':       'spin-slow 20s linear infinite',
        'bounce-y':        'bounce-y 2s ease-in-out infinite',
        'shimmer':         'shimmer 2.5s linear infinite',
        'gradient-shift':  'gradient-shift 8s ease infinite',
        'hero-glow-pulse': 'hero-glow-pulse 4s ease-in-out infinite',
        'marquee':         'marquee 24s linear infinite',
        'scan-line':       'scan-line 3s linear infinite',
      },
      blur: {
        '4xl': '80px',
        '5xl': '120px',
      },
      boxShadow: {
        'glow-sky':  '0 0 40px rgba(79,197,223,0.4), 0 0 80px rgba(79,197,223,0.15)',
        'glow-mint': '0 0 40px rgba(92,191,143,0.4)',
        'glow-lg':   '0 0 60px rgba(79,197,223,0.5), 0 0 120px rgba(79,197,223,0.2)',
      },
    },
  },
};

export default config;
