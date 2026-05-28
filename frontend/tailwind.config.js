// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          2: "var(--paper-2)",
          3: "var(--paper-3)",
          4: "var(--paper-4)",
        },
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          2: {
            DEFAULT: "var(--accent-2)",
            light: "var(--accent-2-light)",
          },
          3: {
            DEFAULT: "var(--accent-3)",
            light: "var(--accent-3-light)",
          },
          4: {
            DEFAULT: "var(--accent-4)",
            light: "var(--accent-4-light)",
          },
        },
        warn: {
          DEFAULT: "var(--warn)",
          light: "var(--warn-light)",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0,0,0,0.06)",
        dropdown: "0 8px 24px rgba(0,0,0,0.10)",
        modal: "0 20px 60px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
}