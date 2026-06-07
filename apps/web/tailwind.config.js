const path = require('node:path');

// Content globs are ABSOLUTE (anchored to this file's directory) so Tailwind
// scans the right files regardless of the process working directory.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [path.join(__dirname, 'src/**/*.{ts,tsx,js,jsx,mdx}')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec2ff',
          400: '#599fff',
          500: '#327bff',
          600: '#1b5cf5',
          700: '#1748d1',
          800: '#193da9',
          900: '#1a3885',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
