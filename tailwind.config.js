/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        court: {
          50: '#f2f9f3',
          100: '#e0f0e3',
          200: '#c1e2c8',
          300: '#92cb9f',
          400: '#5cab6f',
          500: '#3a8d4f',
          600: '#1e5c2f',
          700: '#1a4a28',
          800: '#14381f',
          900: '#0f2d1a',
          950: '#081910',
        },
        amber: {
          50: '#fffaeb',
          100: '#fef0c7',
          200: '#fde68a',
          300: '#f7cb61',
          400: '#f0b429',
          500: '#dd9a12',
          600: '#b8770c',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 45, 26, 0.04), 0 4px 16px -4px rgba(16, 45, 26, 0.10)',
        'card-hover': '0 4px 8px rgba(16, 45, 26, 0.06), 0 18px 44px -10px rgba(16, 45, 26, 0.20)',
        amber: '0 8px 26px -6px rgba(240, 180, 41, 0.55)',
        'inner-top': 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
