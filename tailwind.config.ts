import type { Config } from "tailwindcss";

// MiniCRM design system: monochrome brand (black), neutral grays, 0.5rem controls, 0.75rem cards.
// The existing components use `emerald` as the brand accent and `slate` as neutrals,
// so both palettes are remapped here instead of rewriting every class.
const neutral = {
  50: "#fafafa",
  100: "#f6f6f6",
  200: "#ebebeb",
  300: "#d6d6d6",
  400: "#9a9a9a",
  500: "#737373",
  600: "#555555",
  700: "#404040",
  800: "#1f1f1f",
  900: "#111111",
  950: "#0a0a0a",
};

const brand = {
  50: "#f4f4f4",
  100: "#e9e9e9",
  200: "#d4d4d4",
  300: "#c4c4c4",
  400: "#a3a3a3",
  500: "#262626",
  600: "#111111",
  700: "#000000",
  800: "#1a1a1a",
  900: "#111111",
  950: "#0a0a0a",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: neutral,
        emerald: brand,
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      // MiniCRM-féle típusskála: 14px törzsszöveg, 12.5px a legkisebb
      fontSize: {
        xs: ["12.5px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.55" }],
        lg: ["17px", { lineHeight: "1.45" }],
        xl: ["20px", { lineHeight: "1.35" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
      },
      fontWeight: {
        bold: "600",
        extrabold: "650",
        black: "700",
      },
      borderRadius: {
        lg: "0.4rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
      },
      boxShadow: {
        xs: "0 1px 1px rgba(0,0,0,.03)",
        sm: "0 1px 2px rgba(0,0,0,.03)",
        DEFAULT: "0 1px 3px rgba(0,0,0,.06)",
        md: "0 4px 12px rgba(0,0,0,.06)",
        lg: "0 8px 28px rgba(0,0,0,.12)",
        xl: "0 8px 24px rgba(0,0,0,.25)",
        "2xl": "0 20px 60px rgba(0,0,0,.25)",
      },
    },
  },
  plugins: [],
};
export default config;
