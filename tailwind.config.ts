import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Outfit', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        footer: {
          DEFAULT: "hsl(var(--footer))",
          foreground: "hsl(var(--footer-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          text: "hsl(var(--destructive-text))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        hint: "hsl(var(--hint))",
        "sitter-hero": "hsl(var(--sitter-hero))",
        "toggle-active": "hsl(var(--toggle-active))",
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
          border: "hsl(var(--warning-border))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
          border: "hsl(var(--success-border))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
          border: "hsl(var(--info-border))",
        },
        "strength-weak": "hsl(var(--strength-weak))",
        "strength-medium": "hsl(var(--strength-medium))",
        "strength-good": "hsl(var(--strength-good))",
        "strength-strong": "hsl(var(--strength-strong))",
        founder: {
          DEFAULT: "hsl(var(--founder))",
          foreground: "hsl(var(--founder-foreground))",
          soft: "hsl(var(--founder-soft))",
          border: "hsl(var(--founder-border))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "50px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        /* Variantes douces pour les états vides — fondu lent sans translation
           brutale, pour préserver le rendu peinture des illustrations gouache. */
        "soft-fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "painted-reveal": {
          from: { opacity: "0", transform: "scale(0.985)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "collapsible-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-collapsible-content-height)", opacity: "1" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "alma-wiggle": {
          "0%,100%": { transform: "scale(1) rotate(0deg)" },
          "30%": { transform: "scale(1.06) rotate(-4deg)" },
          "60%": { transform: "scale(1.06) rotate(3deg)" },
        },
        "alma-pop-in": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "70%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "alma-breathe": {
          "0%,100%": { transform: "scale(1) rotate(-2deg)" },
          "50%": { transform: "scale(1.03) rotate(2deg)" },
        },
        "alma-sway": {
          "0%,100%": { transform: "rotate(-3deg) translateY(0)" },
          "50%": { transform: "rotate(3deg) translateY(-2px)" },
        },
        "alma-happy": {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-6px) rotate(-6deg)" },
          "50%": { transform: "translateY(-4px) rotate(6deg)" },
          "75%": { transform: "translateY(-2px) rotate(-4deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
        "alma-attention": {
          "0%,100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(-8deg)" },
          "40%": { transform: "rotate(8deg)" },
          "60%": { transform: "rotate(-6deg)" },
          "80%": { transform: "rotate(6deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        /* Easing organique type "aquarelle qui apparaît" — décélération
           naturelle proche d'un cubic-bezier d'illustrateur. */
        "soft-fade-in": "soft-fade-in 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) forwards",
        "painted-reveal": "painted-reveal 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) forwards",
        "collapsible-down": "collapsible-down 0.3s ease-out",
        "collapsible-up": "collapsible-up 0.3s ease-out",
        "alma-wiggle": "alma-wiggle 0.5s ease-in-out",
        "alma-pop-in": "alma-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "alma-breathe": "alma-breathe 4s ease-in-out infinite",
        "alma-sway": "alma-sway 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
