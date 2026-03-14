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
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
        },
        // Tokens sémantiques (UI) supportant Light/Dark Mode
        background: 'var(--bg-background)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          hover: 'var(--bg-surface-hover)',
        },
        primary: 'var(--text-primary)',
        border: 'var(--border-color)',
        textColor: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        // Couleurs sémantiques fixes de l'application
        success: '#16a34a', // Vert Admis
        danger: '#dc2626',  // Rouge Non Admis
        warning: '#f59e0b', // Orange Rattrapage
      },
      boxShadow: {
        'brand-sm': '0 1px 2px 0 rgba(30, 64, 175, 0.05)',
        'brand-md': '0 4px 6px -1px rgba(30, 64, 175, 0.1), 0 2px 4px -2px rgba(30, 64, 175, 0.1)',
        'brand-lg': '0 10px 15px -3px rgba(30, 64, 175, 0.1), 0 4px 6px -4px rgba(30, 64, 175, 0.1)',
        'brand-xl': '0 20px 25px -5px rgba(30, 64, 175, 0.2), 0 8px 10px -6px rgba(30, 64, 175, 0.2)',
      }
    },
  },
  plugins: [],
}
