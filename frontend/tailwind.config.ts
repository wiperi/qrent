import type { Config } from "tailwindcss";
const defaultTheme = require('tailwindcss/defaultTheme');

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        morandi: {
          green: '#597A69',
          blue: '#2A4C65',
          gray: '#EBEBE9',
          lightBlue: '#BFC2CB'
        }
      },
      transitionTimingFunction: {
        "minor-spring": "cubic-bezier(0.18,0.89,0.82,1.04)",
      },
      keyframes:{
        "reveal-up": {
        "0%": { opacity: "0", transform: "translateY(80%)" },
        "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-down": {
          "0%": { opacity: "0", transform: "translateY(-80%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "content-blur": {
          "0%": { filter: "blur(0.3rem)" },
          "100%": { filter: "blur(0)" },
        },
      },
    }
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
