/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        iris: "rgb(var(--iris) / <alpha-value>)",
        rose: "rgb(var(--rose) / <alpha-value>)",
        foam: "rgb(var(--foam) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        love: "rgb(var(--love) / <alpha-value>)",
        pine: "rgb(var(--pine) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
