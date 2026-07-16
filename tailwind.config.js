/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#023c8b',
          50: '#e6eef9',
          100: '#c2d3f1',
          200: '#8aa9e0',
          300: '#527fce',
          400: '#2a5db8',
          500: '#023c8b',
          600: '#02307a',
          700: '#02266a',
          800: '#011d59',
          900: '#001349',
        },
        cream: {
          DEFAULT: '#faf2e8',
          50: '#fffdfb',
          100: '#faf2e8',
          200: '#f3e3cf',
          300: '#e8d0b0',
          400: '#d9b88a',
        },
        wine: {
          DEFAULT: '#4c1413',
          50: '#f3e3e3',
          100: '#e6c5c5',
          200: '#cc8a8a',
          300: '#a85a5a',
          400: '#7a2d2c',
          500: '#4c1413',
          600: '#3d1010',
          700: '#2e0c0c',
          800: '#1f0808',
          900: '#0f0404',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 1s ease-out forwards',
        'slide-in': 'slideIn 0.6s ease-out forwards',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
