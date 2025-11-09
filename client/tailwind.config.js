import { fontFamily } from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E0E0E',
        parchment: '#E6E2DC',
        fog: '#B9B1A5',
        sand: '#D8C8A8',
        ember: '#E07555',
      },
      fontFamily: {
        display: ['Space Grotesk', ...fontFamily.sans],
      },
      boxShadow: {
        glow: '0 0 60px rgba(216, 200, 168, 0.15)',
      },
    },
  },
  plugins: [],
}
