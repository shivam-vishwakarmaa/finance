/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        heading: ['Satoshi', 'sans-serif'],
      },
      colors: {
        background: 'var(--bg-color)', 
        surface: 'var(--surface-color)', 
        primary: {
          DEFAULT: '#1A56DB', // Razorpay Blue
          glow: 'rgba(26, 86, 219, 0.4)'
        },
        success: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)'
        },
        warning: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.4)'
        },
        danger: {
          DEFAULT: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.4)'
        }
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
