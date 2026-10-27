/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // «Серая галерея»: серый фон, тёмно-синий текст и блоки,
        // бордовый — только действия (кнопки) и выбранное состояние.
        paper: '#E3E3E0',    // фон страниц, шапки, панелей
        ash: '#D2D3D2',      // подписи под плитками, фон каталога, блоки
        fog: '#D9D9D5',      // наведение на светлом, блок итогов
        ink: '#1A2540',      // текст, линии, контурные кнопки (тёмно-синий)
        navy: '#131C30',     // футер, тёмные плашки
        smoke: '#222B3B',    // плитки товаров (сине-графитовый)
        coal: '#1D2534',
        mute: '#535A6B',     // вторичный текст (серый, читается и на ash)
        mist: '#A9AFBC',     // текст на тёмно-синем
        burgundy: {
          DEFAULT: '#56172A', // кнопки действий, выбранное, бейджи
          deep: '#3D0F1D',    // наведение на кнопку
          light: '#E8A7B5',   // ошибки на тёмно-синем фоне
        },
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
