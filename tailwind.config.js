/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // <--- This enables manual Dark Mode toggling
    theme: {
        extend: {
            colors: {
                // These link directly to the CSS variables we just made in index.html!
                bgMain: 'var(--bg-main)',
                bgCard: 'var(--bg-card)',
                textPrimary: 'var(--text-primary)',
                textSecondary: 'var(--text-secondary)',
                accentGreen: '#16a34a',
                accentOrange: '#f97316',
            }
        },
    },
    plugins: [],
}