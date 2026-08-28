/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: {
          50: '#131b2e',
          100: '#1a243b',
          200: '#222f4c',
          300: '#2c3d63',
        },
        border: '#263554',
        accent: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          purple: '#7f53ac',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
        mesh: {
          glow: 'rgba(0, 242, 254, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-purple': '0 0 25px -5px rgba(127, 83, 172, 0.3)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
      },
    },
  },
  plugins: [],
}
