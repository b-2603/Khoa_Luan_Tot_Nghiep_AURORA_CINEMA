/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aurora: {
          blue: "#0066cc",
          darkblue: "#004b99",
          lightblue: "#e6f2ff",
          green: "#00b050",
          cyan: "#17a2b8",
          sidebar: "#f4f6f9",
          border: "#e9ecef"
        }
      }
    },
  },
  plugins: [],
}
