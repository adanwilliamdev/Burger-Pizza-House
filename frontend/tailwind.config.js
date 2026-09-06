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
        primary: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
        },
        surface: '#F8FAFC',
        card: '#FFFFFF',
        ink: '#111827',
        muted: '#6B7280',
        line: '#E5E7EB',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        sidebar: {
          DEFAULT: '#111827',
          hover: '#1F2937',
          active: '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.06)',
        'soft-lg': '0 12px 32px rgba(0,0,0,0.10)',
      },
      spacing: {
        18: '4.5rem',
      },
      transitionDuration: {
        200: '200ms',
      },
    },
  },
  plugins: [],
}

