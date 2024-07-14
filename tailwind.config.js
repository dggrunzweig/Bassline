/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'noise': "url('./src/assets/nnnoise.svg')"
      },
      boxShadow: {
        'glowing': '0 0 15px rgba(0, 0, 0, 0.3)',
      }

    },
  },
  plugins: [],
}