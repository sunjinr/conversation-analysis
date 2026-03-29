/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#FFFFFF',
          hover: '#F5F5F3',
          active: '#F0EBFF',
          border: '#F0EEE9',
        },
        brand: {
          DEFAULT: '#7C5CFC',
          light: '#9B85FD',
          dark: '#6344E0',
          subtle: '#F0EBFF',
        },
        surface: {
          DEFAULT: '#F7F7F5',
        },
      },
    },
  },
  plugins: [],
}
