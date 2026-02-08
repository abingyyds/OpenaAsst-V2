/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#faf9f5',
        surface: { DEFAULT: '#F4F3EE', hover: '#EAE8E1' },
        ink: { DEFAULT: '#141413', secondary: '#57534e', muted: '#a8a29e' },
        accent: { DEFAULT: '#d97757', hover: '#c2613f', light: '#fef3ee' },
        sidebar: '#292524',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
