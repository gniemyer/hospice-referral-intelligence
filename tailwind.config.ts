import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "/Users/gniemyer/hospice-referral-intelligence/app/**/*.{js,ts,jsx,tsx,mdx}",
    "/Users/gniemyer/hospice-referral-intelligence/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0faff",
          100: "#e0f4fe",
          200: "#b9e8fd",
          300: "#7cd8fb",
          400: "#36c3f6",
          500: "#00b4d8",
          600: "#0090b2",
          700: "#007494",
          800: "#005c78",
          900: "#1a3a5c",
          950: "#0f2640",
        },
        navy: {
          800: "#1e2a5e",
          900: "#1a2250",
          950: "#12183d",
        },
        teal: {
          300: "#7fdbda",
          400: "#4ecdc4",
          500: "#00b4d8",
        },
        surface: {
          50: "#f8fafc",
          100: "#f0f4f8",
        },
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #1a3a5c 0%, #00b4d8 50%, #7fdbda 100%)",
        "gradient-sidebar":
          "linear-gradient(180deg, #12183d 0%, #1a3a5c 100%)",
        "gradient-auth":
          "linear-gradient(135deg, #0f2640 0%, #1a3a5c 40%, #00b4d8 100%)",
        "gradient-button":
          "linear-gradient(135deg, #00b4d8 0%, #007494 100%)",
        "gradient-button-hover":
          "linear-gradient(135deg, #007494 0%, #005c78 100%)",
        "gradient-card-accent":
          "linear-gradient(135deg, #00b4d8 0%, #7fdbda 100%)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 12px 0 rgba(0, 180, 216, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
