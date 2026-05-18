export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E0F2FE",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#2563EB",
          600: "#2563EB",
          700: "#1D4ED8"
        },
        mint: {
          500: "#10B981",
          600: "#059669"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
