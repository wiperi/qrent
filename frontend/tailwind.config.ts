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
          gray: '#EBEBE9'
        }
      }
    }
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
