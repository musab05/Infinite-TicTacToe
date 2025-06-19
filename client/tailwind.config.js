/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neonBlue: '#00f0ff',
        neonPink: '#ff00f0',
        darkBg: '#0f0f0f',
      },
    },
  },
  plugins: [],
};
