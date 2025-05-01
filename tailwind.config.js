/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontFamily: {
      sans: [
        '"Inter", sans-serif',
        {
          fontFeatureSettings: '"calt", "liga", "case","cv11"',
        },
      ],
    },
  },
  plugins: [],
}

