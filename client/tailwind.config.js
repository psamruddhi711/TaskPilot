/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        light: {
          bg: '#F5F6F8',
          surface: '#FFFFFF',
          secondary: '#F1F3F5',
          text: '#202124',
          subtext: '#6B7280',
          muted: '#9CA3AF',
          border: '#E5E7EB',
          accent: '#4F46E5',
          success: '#15803D',
          warning: '#B45309',
          error: '#B91C1C'
        },
        dark: {
          bg: '#111315',
          sidebar: '#181A1D',
          surface: '#1C1F23',
          secondary: '#25292E',
          text: '#F3F4F6',
          subtext: '#A1A1AA',
          muted: '#71717A',
          border: '#30343A',
          accent: '#818CF8',
          success: '#4ADE80',
          warning: '#FBBF24',
          error: '#F87171'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

