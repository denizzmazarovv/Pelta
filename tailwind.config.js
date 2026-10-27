/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Палитра: тёмно-синий, тёмно-бордовый, серые и тёмно-серые
        ink: '#0F1A2E',      // основной текст, кнопки (тёмно-синий)
        navy: '#14233D',     // шапка, футер, акцентные плашки
        burgundy: '#5C1A2B', // редкие акценты: наведение, выделение, статусы
        mute: '#5E6578',     // вторичный текст (холодный серый)
        ash: '#CDD1D8',      // линии, плейсхолдеры товаров
        fog: '#EDEEF1',      // светлые подложки
        smoke: '#2B303C',    // тёмно-серый: фоны карточек, тёмные блоки
        coal: '#1B2030',     // почти чёрный с синевой
      },
      fontFamily: {
        logo: ['"Arya"', '"Fira Sans Condensed"', 'sans-serif'],
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
