import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#121c19',
        'primary-container': '#27312e',
        secondary: '#307158',
        'secondary-container': '#deeadf',
        'on-surface-variant': '#434846',
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        headline: ['Newsreader', 'Georgia', 'serif'],
        body: ['Manrope', 'sans-serif'],
        label: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
      },
    },
  },
  plugins: [forms],
};
