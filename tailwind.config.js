/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        mute: '#6b6b6b',
        ash: '#d9d9d9',
        fog: '#ececec',
        smoke: '#3b3b3b',
        coal: '#2e2e2e',
      },
      fontFamily: {
        display: ['"Fira Sans Condensed"', '"Arial Narrow"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      height: { header: '50px' },
      spacing: { header: '50px' },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideLeft: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        slideRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fadeIn .35s ease-out both',
        'slide-left': 'slideLeft .35s cubic-bezier(.2,.8,.2,1) both',
        'slide-right': 'slideRight .35s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
