/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontFamily: {
      sans: [
        '"InterVariable", sans-serif',
        {
          fontFeatureSettings: '"calt", "liga", "cv11"',
        },
      ],
    },
    extend: {
      colors: {
        ikea: '#feda00',
        autobot: '#e10000',
        decepticon: '#6f4da1',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}