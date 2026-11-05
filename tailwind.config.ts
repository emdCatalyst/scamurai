import type { Config } from 'tailwindcss';

/**
 * Misdaq identity. The token names predate the rebrand and are kept so the
 * code follows without edits: `navy` is Misdaq Black, `sky` is the order
 * evidence product colour (orange, the action colour) and `mint` is a muted
 * functional success green. Text on `sky` is black, never white.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:     '#0B0B0B',
        sky: {
          DEFAULT: '#FF5B3A',
          50:  '#FFF3F0',
          100: '#FFE4DD',
          200: '#FFC9BB',
          300: '#FFA48E',
          400: '#FF7E61',
          500: '#FF5B3A',
          600: '#E8431F',
          700: '#C23315',
          800: '#9A2B15',
          900: '#7D2716',
          950: '#441009',
        },
        mint:     '#4E9A72',
        charcoal: '#2A2A28',
        offwhite: '#F4F3EF',
        'navy-deep': '#0B0B0B',
        'sky-dim':   'rgba(255,91,58,0.15)',
        'mint-dim':  'rgba(78,154,114,0.12)',
        // Neutrals and the other product colours, by their names in the guide.
        paper:    '#F4F3EF',
        line:     '#C9C8C2',
        stone:    '#5F5F59',
        cobalt:   '#2D5BFF',
        saffron:  '#FFC72C',
        lilac:    '#A98BFF',
      },
      fontFamily: {
        sans:    ['var(--font-plex)', 'system-ui', 'sans-serif'],
        arabic:  ['var(--font-plex)', 'system-ui', 'sans-serif'],
        // Amiri in English, The Year of Handicrafts (Plex 700 until licensed) in Arabic.
        heading: ['var(--font-heading)'],
      },
      // Flat by design: the old gradients resolve to single colours.
      backgroundImage: {
        'gradient-hero':      'linear-gradient(#0B0B0B, #0B0B0B)',
        'gradient-cta':       'linear-gradient(#FF5B3A, #FF5B3A)',
        'gradient-cta-r':     'linear-gradient(#FF5B3A, #FF5B3A)',
        'gradient-sky-radial':'none',
        'gradient-shimmer':   'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
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
      // No glows in this identity.
      boxShadow: {
        'glow-sky':  'none',
        'glow-mint': 'none',
        'glow-lg':   'none',
      },
      borderRadius: {
        card:  '28px',
        field: '12px',
      },
    },
  },
};

export default config;
