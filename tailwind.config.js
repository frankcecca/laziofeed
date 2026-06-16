/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  // Dark mode automatico: segue la preferenza del sistema (prefers-color-scheme).
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // Colori sociali della S.S. Lazio
        lazio: {
          sky: "#87CEEB",
          blue: "#0a3d91",
          white: "#ffffff",
        },
        // Palette "blu notte" per il tema scuro
        night: {
          bg: "#0b1626", // fondo pagina
          card: "#122039", // superficie card
          raised: "#18294a", // card principale (hero) in rilievo
          border: "#24344f", // bordi/divisori
        },
      },
    },
  },
  plugins: [],
};
