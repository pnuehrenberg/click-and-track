/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#3f3f46', /* Zinc 700 - Borders/Hovers */
          800: '#27272a', /* Zinc 800 - Inputs/Subtler Backgrounds */
          850: '#27272a', /* Zinc 800 - Headers/Footers */
          900: '#18181b', /* Zinc 900 - Main Surface */
          950: '#121215', /* Custom Lighter Zinc 950 - Deep Backgrounds */
        },
        active: '#EF8A62',
        inactive: '#67A9CF'
      }
    },
  },
  plugins: [],
}