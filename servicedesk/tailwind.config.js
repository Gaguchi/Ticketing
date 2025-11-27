/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand color - iTECH blue (darker for better contrast)
        brand: {
          50:  '#e6f7fc',
          100: '#c2ebf7',
          200: '#8dd9f0',
          300: '#4fc4e6',
          400: '#1a9fca',  // Main brand color (darker)
          500: '#0d7ea3',  // Hover state
          600: '#0a6585',
          700: '#084d66',
          800: '#063847',
          900: '#042430',
        },
        // Primary uses brand colors
        primary: {
          50:  '#e6f7fc',
          100: '#c2ebf7',
          200: '#8dd9f0',
          300: '#4fc4e6',
          400: '#1a9fca',
          500: '#0d7ea3',
          600: '#0a6585',
          700: '#084d66',
          800: '#063847',
          900: '#042430',
        },
        // Status colors for tickets
        status: {
          open:       '#f59e0b',  // Amber
          inProgress: '#1a9fca',  // Brand blue
          waiting:    '#8b5cf6',  // Purple
          resolved:   '#10b981',  // Green
        },
        // Grays for UI
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
}
