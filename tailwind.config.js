/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/components/landing/**/*.{js,ts,jsx,tsx}",
    "./src/components/PublicLandingPage.tsx"
  ],
  important: '#landing-page-root',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          bg: '#090D16',
          card: '#111827',
          accent: '#F59E0B',
          blueNeon: '#3B82F6',
          success: '#10B981'
        }
      }
    }
  },
  plugins: [],
}
