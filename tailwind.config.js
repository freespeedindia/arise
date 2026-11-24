/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        saffron: { 50: '#FFF5EB', 100: '#FFE7CC', 300: '#FFBE73', 400: '#FFA64D', 500: '#FF9933', 600: '#F07C0A', 700: '#C25E00' },
        health: { 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A' },
        wealth: { 400: '#FACC15', 500: '#EAB308', 600: '#CA8A04' },
        mind: { 400: '#FFA64D', 500: '#FF8C1A', 600: '#E06F00' },
        work: { 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB' },
        ink: { 900: '#14121F', 800: '#1E1B2E', 700: '#2A2640' },
      },
      fontFamily: { sans: ['Nunito', 'system-ui', 'sans-serif'], display: ['Poppins', 'Nunito', 'sans-serif'] },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
