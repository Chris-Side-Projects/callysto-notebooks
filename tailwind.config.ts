import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jupiter / Callisto-inspired palette: deep blue-black with warm accents.
        ink: {
          950: "#0a0d14",
          900: "#11151f",
          800: "#181d2a",
          700: "#222838",
          600: "#2f3548",
          500: "#404862",
        },
        moon: {
          50: "#f7f5ef",
          100: "#ebe6d6",
          200: "#d6cdb0",
          300: "#beb084",
          400: "#a89760",
        },
        accent: {
          500: "#f5a524",
          600: "#d98a0f",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
