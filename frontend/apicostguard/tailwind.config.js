
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
      fontFamily: {
        sans: [
          "Geist Variable",
          "Inter",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "Geist Mono Variable",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        cardhover: "var(--shadow-card-hover)",
        "accent-glow": "0 0 24px rgb(var(--accent) / 0.18)",
        "sm-accent": "0 1px 2px rgb(2 6 23 / 0.35), 0 4px 10px -4px rgb(59 130 246 / 0.28)",
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out both",
        "fade-up": "fade-up 0.24s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.16s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-beat": "pulse-beat 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 1.8s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "grow-bar": "grow-bar 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-beat": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.82)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "grow-bar": {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
      },
    },
  },
  plugins: [],
};