/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        emerald: {
          950: '#0D2818',
          900: '#0F3D2A',
          800: '#145A3E',
          700: '#1A7A55',
        },
        gold: {
          DEFAULT: '#D4A843',
          light: '#E8C875',
          dark: '#B8912E',
        },
        warm: {
          50: '#F5F3EF',
          100: '#EDE9E1',
          200: '#DDD8CC',
          300: '#C9C1B1',
        },
        dark: {
          DEFAULT: '#1A1A2E',
          light: '#252542',
          lighter: '#32324E',
        },
        coral: {
          DEFAULT: '#E85D4A',
          light: '#F08070',
          dark: '#C94432',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
