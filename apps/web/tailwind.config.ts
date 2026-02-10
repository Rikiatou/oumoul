import type { Config } from "tailwindcss";
import tokens from "../../packages/ui/tokens.json" assert { type: "json" };

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        "primary-dark": tokens.colors.primaryDark,
        secondary: tokens.colors.secondary,
        accent: tokens.colors.accent,
        neutral: {
          100: tokens.colors.neutral100,
          900: tokens.colors.neutral900,
        },
      },
      spacing: {
        xs: `${tokens.spacing.xs}px`,
        sm: `${tokens.spacing.sm}px`,
        md: `${tokens.spacing.md}px`,
        lg: `${tokens.spacing.lg}px`,
        xl: `${tokens.spacing.xl}px`,
        "2lg": `${tokens.spacing.lg * 2}px`,
      },
      borderRadius: {
        sm: `${tokens.radii.sm}px`,
        md: `${tokens.radii.md}px`,
        lg: `${tokens.radii.lg}px`,
        pill: `${tokens.radii.pill}px`,
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        elevation: "0 24px 48px rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
