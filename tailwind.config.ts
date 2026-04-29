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
        // tons cinzas mais finos pra densidade
        line: {
          DEFAULT: "#E8EAEF",
          subtle: "#EEF0F4",
          strong: "#D5D9E0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // hierarquia editorial
        "display": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h1": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        "h2": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "700" }],
        "h3": ["1.125rem", { lineHeight: "1.4", letterSpacing: "-0.005em", fontWeight: "600" }],
        "eyebrow": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      boxShadow: {
        // 5 níveis de profundidade — multilayer pra parecer real
        xs: "0 1px 2px rgba(13, 15, 26, 0.04)",
        sm: "0 1px 2px rgba(13, 15, 26, 0.04), 0 1px 3px rgba(13, 15, 26, 0.04)",
        md: "0 4px 14px -4px rgba(13, 15, 26, 0.08), 0 2px 6px rgba(13, 15, 26, 0.04)",
        lg: "0 12px 32px -8px rgba(13, 15, 26, 0.12), 0 4px 12px rgba(13, 15, 26, 0.06)",
        xl: "0 24px 56px -12px rgba(13, 15, 26, 0.18), 0 8px 24px rgba(13, 15, 26, 0.08)",
        // aliases pra compatibilidade com componentes antigos
        card: "0 1px 2px rgba(13, 15, 26, 0.04), 0 1px 3px rgba(13, 15, 26, 0.04)",
        "card-hover":
          "0 6px 20px -4px rgba(13, 15, 26, 0.10), 0 2px 6px rgba(13, 15, 26, 0.04)",
        raised:
          "0 4px 16px -6px rgba(13, 15, 26, 0.12), 0 2px 4px rgba(13, 15, 26, 0.04)",
        pop: "0 12px 32px -8px rgba(43, 45, 255, 0.25), 0 4px 12px rgba(43, 45, 255, 0.08)",
        glow: "0 0 0 3px rgba(43, 45, 255, 0.12)",
        // glow colorido pra estados especiais
        "glow-lima": "0 0 0 3px rgba(141, 198, 63, 0.18)",
        "glow-red": "0 0 0 3px rgba(220, 38, 38, 0.18)",
        "glow-amber": "0 0 0 3px rgba(245, 158, 11, 0.18)",
      },
      borderRadius: {
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      backgroundImage: {
        "gradient-royal":
          "linear-gradient(135deg, #2B2DFF 0%, #4F52FF 100%)",
        "gradient-royal-soft":
          "linear-gradient(135deg, rgba(43, 45, 255, 0.08) 0%, rgba(79, 82, 255, 0.04) 100%)",
        "gradient-lima":
          "linear-gradient(135deg, #8DC63F 0%, #99CB40 100%)",
        "gradient-surface":
          "linear-gradient(180deg, #FBFCFE 0%, #F2F4F9 100%)",
        "gradient-shine":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
        // mesh pra hero do dashboard
        "gradient-mesh":
          "radial-gradient(at 0% 0%, rgba(43, 45, 255, 0.08) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(141, 198, 63, 0.08) 0px, transparent 50%)",
        // borda gradiente
        "gradient-border-royal":
          "linear-gradient(180deg, rgba(43, 45, 255, 0.2) 0%, rgba(43, 45, 255, 0) 100%)",
        // texturas
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
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
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "fade-in-up": "fade-in-up 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right": "slide-in-right 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-left": "slide-in-left 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 2s linear infinite",
        "scale-in": "scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "spin-slow": "spin-slow 6s linear infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        "250": "250ms",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
