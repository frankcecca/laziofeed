/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Colori sociali della S.S. Lazio
        lazio: {
          sky: "#87CEEB",
          blue: "#0a3d91",
          white: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
