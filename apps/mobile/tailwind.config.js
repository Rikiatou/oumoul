const { preset } = require("nativewind/preset");
const tokens = require("../../packages/ui/tokens.json");

module.exports = {
  content: ["./App.{ts,tsx}", "./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [preset],
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
        xs: tokens.spacing.xs,
        sm: tokens.spacing.sm,
        md: tokens.spacing.md,
        lg: tokens.spacing.lg,
        xl: tokens.spacing.xl,
      },
      borderRadius: {
        sm: tokens.radii.sm,
        md: tokens.radii.md,
        lg: tokens.radii.lg,
        pill: tokens.radii.pill,
      },
      fontFamily: {
        sans: ["System"],
        display: ["System"],
      },
    },
  },
};
