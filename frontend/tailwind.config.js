/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./camera/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        primary: ['Unbounded', 'sans-serif'],
        unbounded: ['Unbounded', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        aclonica: ['Aclonica', 'sans-serif'],
      },
      colors: {
        primary: '#7BA367',      // green
        secondary: '#F2F7EE',    // light green
        accent: '#818F42',       // darker green
        highlight: '#E9C46A',    // yellow
        danger: '#BC4749',       // red
      },
    },
  },
  plugins: [],
}