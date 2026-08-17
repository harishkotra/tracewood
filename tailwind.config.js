/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          bg: "#080a09",       // Near-black organic base
          panel: "rgba(13, 18, 15, 0.75)", // Glassmorphic moss-charcoal
          moss: "#344e41",     // Dark moss green
          leaf: "#a3b18a",     // Muted leaf green
          fern: "#588157",     // Vibrant but organic green
          sage: "#dad7cd",     // Warm off-white
          glow: "#f0e6d2",     // Soft warm ivory glow
          gold: "#d4af37",     // Subtle premium gold accent
          rust: "#8b5a2b",     // Muted red/brown for failed work
          crimson: "#9e2a2b",  // Deep warnings
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
