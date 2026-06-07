/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind where your components are
  // so it only includes CSS classes you actually use
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // BizCore brand colors — used as: bg-primary, text-primary
      colors: {
        primary: {
          50:  '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}