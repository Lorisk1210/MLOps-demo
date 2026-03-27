/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        neoDisplay: ['"Syne"', 'sans-serif'],
        neoBody: ['"Epilogue"', 'sans-serif'],
      },
      colors: {
        neoBg: '#FFFFFF',
        neoText: '#000000',
        neoYellow: '#FFE800',
        neoPink: '#FF007F',
        neoBlue: '#00E5FF',
      }
    },
  },
  plugins: [],
};
