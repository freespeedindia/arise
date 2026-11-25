/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic surfaces (switch with light/dark mode)
        bg: v('bg'), surface: v('surface'), sunken: v('sunken'), line: v('line'),
        ink: v('ink'), muted: v('muted'), faint: v('faint'),
        // Brand — matte tones
        saffron: { DEFAULT: v('saffron'), soft: v('saffron-soft'), deep: v('saffron-deep') },
        gold: { DEFAULT: v('gold'), soft: v('gold-soft') },
        crimson: { DEFAULT: v('crimson'), soft: v('crimson-soft') },
        forest: { DEFAULT: v('forest'), soft: v('forest-soft') },
        water: { DEFAULT: v('water'), soft: v('water-soft') },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      boxShadow: { card: '0 1px 2px rgb(34 27 21 / 0.04), 0 4px 16px -8px rgb(34 27 21 / 0.08)' },
      fontSize: { '2xs': ['11px', '14px'] },
    },
  },
  plugins: [],
}
