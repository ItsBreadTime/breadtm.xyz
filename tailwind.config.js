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
  },
  plugins: [],
}

