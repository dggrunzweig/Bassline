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
      },
      gridTemplateColumns: {
        // Simple 16 column grid
        '16': 'repeat(16, minmax(0, 1fr))',
      }

    },
  },
  plugins: [],
}