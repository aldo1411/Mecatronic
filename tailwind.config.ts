import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eaf3de",
          100: "#c0dd97",
          200: "#97c459",
          300: "#639922",
          400: "#3b6d11",
          500: "#27500a",
          600: "#173404",
        },
        surface: {
          0:   "#0e0e0f",
          1:   "#111113",
          2:   "#1a1a1c",
          3:   "#2a2a2c",
        },
        text: {
          primary:   "#e8e8e6",
          secondary: "#b4b2a9",
          muted:     "#888780",
          faint:     "#5f5e5a",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        fadeIn:  "fadeIn 0.2s ease-out forwards",
        slideIn: "slideIn 0.2s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
