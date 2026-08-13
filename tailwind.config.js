/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nestor: {
          base: '#0A0A0E',
          card: '#14141C',
          cardHover: '#1C1C26',
          obsidian: '#09090D',
          charcoal: '#1E1E28',
          red: '#FF3B00',
          redDark: '#D02E00',
          redLight: '#FF3B0020',
          green: '#22C55E',
          greenDark: '#16A34A',
          greenLight: '#22C55E20',
          gold: '#FACC15',
          border: '#262636'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Outfit', 'sans-serif']
      },
      boxShadow: {
        'premium': '0 20px 45px -15px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
        'premium-hover': '0 28px 55px -15px rgba(255, 59, 0, 0.35), 0 12px 25px -10px rgba(34, 197, 94, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.6)'
      }
    },
  },
  plugins: [],
}
