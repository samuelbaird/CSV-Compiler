module.exports = {
  content: ["./index.html", "./src/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#1E40AF", // Blue
        secondary: "#1E3A8A", // Darker blue
        accent: "#22C55E", // Green
        light: "#F3F4F6", // Light gray
        dark: "#1F2937", // Dark gray
      },
      boxShadow: {
        card: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
