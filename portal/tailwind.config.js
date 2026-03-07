/** @type {import('tailwindcss').Config} */
export default {
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
          subtle: 'var(--brand-subtle)',
        },
        // Couleurs sémantiques fixes de l'application
        success: '#16a34a', // Vert Admis
        danger: '#dc2626',  // Rouge Non Admis
        warning: '#f59e0b', // Orange Rattrapage
      },
    },
  },
  plugins: [],
}
