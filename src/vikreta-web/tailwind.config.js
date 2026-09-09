/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FBF4E6',
        'paper-alt': '#F3E9D4',
        ink: '#241F1C',
        'ink-soft': '#7A6F60',
        teal: {
          DEFAULT: '#1D7874',
          dark: '#14524F',
          light: '#E8F2F1',
        },
        marigold: {
          DEFAULT: '#E8A33D',
          dark: '#B87A22',
          light: '#FDF3E3',
        },
        cherry: {
          DEFAULT: '#C8443C',
          light: '#FDECEA',
        },
        plum: {
          DEFAULT: '#6B4E71',
          light: '#F0EAF2',
        },
        line: '#E4D7BC',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderWidth: {
        DEFAULT: '2px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(36,31,28,0.08)',
        'receipt': '0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
