export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'cursive'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f0f0f0', 100: '#d9d9d9', 200: '#b3b3b3',
          300: '#8c8c8c', 400: '#666666', 500: '#404040',
          600: '#2b2b2b', 700: '#1a1a1a', 800: '#111111', 900: '#0a0a0a',
        },
        acid: {
          DEFAULT: '#c8ff00',
          dark: '#a3cc00',
        },
        danger: '#ff3b30',
        warn: '#ff9f0a',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
