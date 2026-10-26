import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        success: "var(--success)",
        "brand-green": "var(--brand-green)",
        mint: "var(--mint)",
        surface: "var(--surface)",
        warning: "var(--warning)",
        error: "var(--error)"
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px"
      }
    }
  },
  plugins: []
};

export default config;
