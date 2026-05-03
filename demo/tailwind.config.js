/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './*.html',
    './guide/*.html',
    './public/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF8C42',
          'orange-dark': '#E67E22',
          blue: '#003049',
          'blue-dark': '#001D2D',
          cyan: '#00AEEF',
          sand: '#FDF0D5',
          'sand-dark': '#F2E5C8',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      borderRadius: {
        zirel: '2rem',
      },
    },
  },
  plugins: [],
};
