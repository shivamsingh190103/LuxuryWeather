import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#040712",
          900: "#081029",
          800: "#0d1f45"
        },
        glass: {
          base: "rgba(255, 255, 255, 0.05)",
          edge: "rgba(255, 255, 255, 0.10)",
          glow: "rgba(121, 198, 255, 0.30)"
        }
      },
      boxShadow: {
        glass: "0 24px 80px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        mesh: {
          "0%": { backgroundPosition: "0% 0%, 100% 100%, 50% 50%" },
          "50%": { backgroundPosition: "100% 0%, 0% 100%, 40% 60%" },
          "100%": { backgroundPosition: "0% 0%, 100% 100%, 50% 50%" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        mesh: "mesh 30s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
