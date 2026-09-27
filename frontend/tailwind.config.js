/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nike: {
          dark: "#111111",
          gray: "#707072",
          light: "#f5f5f5",
          red: "#e52e2e",
        }
      }
    },
  },
  plugins: [],
}
