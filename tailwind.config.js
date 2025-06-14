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
        ikeayellow: '#feda00',
        ikeablue: '#0058AB',
        autobot: '#e10000',
        decepticon: '#6f4da1',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}