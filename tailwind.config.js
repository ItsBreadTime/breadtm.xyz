import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['CommitMono', ...defaultTheme.fontFamily.mono],
        accent: ['Goldman', ...defaultTheme.fontFamily.sans],
      },
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