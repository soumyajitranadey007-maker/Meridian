import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#0a2a2b", teal: "#0f3d3e", surface: "#134847", cream: "#eef5f0", mint: "#4fd1c5", amber: "#f4c978", coral: "#ee806d", lilac: "#b9a9ff" },
      boxShadow: { card: "inset 0 1px 0 rgba(238,245,240,.06), 0 24px 60px -32px rgba(0,0,0,.72)", mint: "0 12px 32px -12px rgba(79,209,197,.5)" }
    }
  },
  plugins: []
} satisfies Config;
