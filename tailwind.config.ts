import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          DEFAULT: "#2B2DFF",
          50: "#EEEEFF",
          100: "#DADAFF",
          200: "#B5B6FF",
          300: "#8F91FF",
          400: "#6A6DFF",
          500: "#2B2DFF",
          600: "#2224CC",
          700: "#1A1B99",
          800: "#111266",
          900: "#090933",
        },
        lima: {
          DEFAULT: "#8DC63F",
          50: "#F3F9E9",
          100: "#E5F2CE",
          200: "#CCE59F",
          300: "#B3D86F",
          400: "#99CB40",
          500: "#8DC63F",
          600: "#6E9B31",
          700: "#527525",
          800: "#374E19",
          900: "#1B270C",
        },
        surface: "#F7F8FA",
        ink: "#0D0F1A",
      },
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // sombras suaves e multilayer — estilo premium
        xs: "0 1px 2px rgba(13, 15, 26, 0.04)",
        card: "0 1px 2px rgba(13, 15, 26, 0.04), 0 1px 3px rgba(13, 15, 26, 0.04)",
        "card-hover":
          "0 6px 20px -4px rgba(13, 15, 26, 0.10), 0 2px 6px rgba(13, 15, 26, 0.04)",
        raised:
          "0 4px 16px -6px rgba(13, 15, 26, 0.12), 0 2px 4px rgba(13, 15, 26, 0.04)",
        pop: "0 12px 32px -8px rgba(43, 45, 255, 0.25), 0 4px 12px rgba(43, 45, 255, 0.08)",
        glow: "0 0 0 3px rgba(43, 45, 255, 0.12)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      backgroundImage: {
        "gradient-royal":
          "linear-gradient(135deg, #2B2DFF 0%, #4F52FF 100%)",
        "gradient-surface":
          "linear-gradient(180deg, #FBFCFE 0%, #F2F4F9 100%)",
        "gradient-shine":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "fade-in-up": "fade-in-up 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right":
          "slide-in-right 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 2s linear infinite",
        "scale-in": "scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
