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
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-4": "var(--ink-4)",
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        "paper-3": "var(--paper-3)",
        "paper-4": "var(--paper-4)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-light": "var(--accent-light)",
        "accent-2": "var(--accent-2)",
        "accent-2-light": "var(--accent-2-light)",
        "accent-3": "var(--accent-3)",
        "accent-3-light": "var(--accent-3-light)",
        "accent-4": "var(--accent-4)",
        "accent-4-light": "var(--accent-4-light)",
        warn: "var(--warn)",
        "warn-light": "var(--warn-light)",
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
      backgroundImage: {
        'gradient-header': "linear-gradient(135deg, #0f0e0c 0%, #2a1f14 100%)",
        'gradient-shimmer': "linear-gradient(135deg, var(--paper-2) 0%, var(--accent-light) 100%)",
        'gradient-sidebar': "linear-gradient(180deg, var(--paper-2) 0%, var(--paper-3) 100%)",
        'gradient-auth': "radial-gradient(ellipse at 30% 20%, rgba(200,81,10,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(26,61,107,0.05) 0%, transparent 60%), var(--paper)",
        'gradient-btn': "linear-gradient(135deg, #d4620f 0%, #c8510a 50%, #b8440a 100%)",
        'gradient-btn-hover': "linear-gradient(135deg, #c8510a 0%, #b8440a 100%)",
      },
      boxShadow: {
        'card-hover': '0 4px 16px rgba(0,0,0,0.06)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.10)',
        'modal': '0 20px 60px rgba(0,0,0,0.15)',
      }
    },
  },
  plugins: [],
}