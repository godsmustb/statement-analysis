/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFB3E6',
        secondary: '#B3E5FC',
        accent: '#C5E1A5',
        warning: '#FFE082',
        success: '#AED581',
        background: '#F8F9FA',
        textDark: '#2C3E50',
      },
      boxShadow: {
        'pastel': '0 4px 6px -1px rgba(255, 179, 230, 0.2), 0 2px 4px -1px rgba(179, 229, 252, 0.1)',
        'pastel-lg': '0 10px 15px -3px rgba(255, 179, 230, 0.3), 0 4px 6px -2px rgba(179, 229, 252, 0.2)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideIn': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
