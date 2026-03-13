import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
        accent: {
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
        },
        surface: {
          50: "#fafafa",
          100: "#f4f4f5",
        },
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        "gradient-sidebar":
          "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
        "gradient-auth":
          "linear-gradient(135deg, #c084fc 0%, #f0abfc 40%, #fbcfe8 100%)",
        "gradient-button":
          "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        "gradient-button-hover":
          "linear-gradient(135deg, #9333ea 0%, #db2777 100%)",
        "gradient-card-accent":
          "linear-gradient(135deg, #a855f7 0%, #f0abfc 100%)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 12px 0 rgba(168, 85, 247, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
