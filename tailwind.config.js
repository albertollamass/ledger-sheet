/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        papel: '#F3F5F9',
        tinta: '#1D2A4D',
        boli: '#2B4BD3',
        rojo: '#B3271E',
        haber: '#1E7A4C'
      },
      fontFamily: {
        slab: ['"Zilla Slab"', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
