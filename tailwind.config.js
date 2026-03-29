/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#FAFAF8',
          hover: '#F5F3F0',
          active: '#F5F3F0',
          border: '#EEECEA',
        },
        brand: {
          DEFAULT: '#1D1D1F',
          light: '#3A3A3C',
          dark: '#000000',
          subtle: '#F5F3F0',
        },
        accent: {
          DEFAULT: '#E8735A',
          light: '#FFF0EC',
          dark: '#D4604A',
        },
        surface: {
          DEFAULT: '#F7F7F5',
        },
      },
    },
  },
  plugins: [],
}
