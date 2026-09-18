/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        // Brand scale built around the logo green (#00a95c).
        glory: {
          50: '#e8f8ef',
          100: '#c9efd9',
          200: '#97e0b7',
          300: '#5ccd8f',
          400: '#25b86c',
          500: '#00a95c',
          600: '#008548',
          700: '#00703c',
          800: '#055832',
          900: '#06482a',
          950: '#022816',
        },
        // Semantic tokens; values live in src/index.css and switch with the theme.
        canvas: token('canvas'),
        surface: token('surface'),
        subtle: token('subtle'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        brand: token('brand'),
        'brand-ink': token('brand-ink'),
        'brand-soft': token('brand-soft'),
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
