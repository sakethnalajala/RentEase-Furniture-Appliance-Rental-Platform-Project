/** @type {import('tailwindcss').Config} */
module.exports = {
  // Glass/Midnight (see components/ThemeProvider.js) each apply their own class rather than
  // `.dark` — matching both here means every existing `dark:` utility already gives the right
  // contrast under both, with no separate variant per theme to maintain.
  darkMode: ['selector', ':is(.dark, .theme-glass, .theme-midnight)'],
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
          inverted: 'rgb(var(--surface-inverted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-lexend)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        glow: '0 0 40px -8px rgba(99, 102, 241, 0.55)',
        'glow-accent': '0 0 40px -8px rgba(249, 115, 22, 0.55)',
        premium: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -8px rgba(15,23,42,0.12)',
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 0% 0%, rgba(99,102,241,0.20) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(249,115,22,0.16) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(99,102,241,0.14) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(236,72,153,0.14) 0px, transparent 50%)',
        'mesh-dark':
          'radial-gradient(at 0% 0%, rgba(99,102,241,0.30) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(249,115,22,0.20) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(129,140,248,0.22) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(236,72,153,0.18) 0px, transparent 50%)',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        blob: 'blob 14s infinite ease-in-out',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        // Route-level loading screens (see components/ui/PortalLoading.js) fade in rather than
        // snapping into view — a plain CSS animation (no framer-motion) so the very first paint
        // of a route transition stays as cheap/fast as possible.
        'fade-in': 'fade-in 0.35s ease-out',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
