/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1890ff', // Ant Design default blue
        secondary: '#f0f2f5',
      }
    },
  },
  plugins: [],
}
