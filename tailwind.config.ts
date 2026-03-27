/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#000000',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        border: '#1e1e1e',
        'border-2': '#2a2a2a',
        green: '#22c55e',
        'green-bg': '#052010',
        'green-border': '#0a3020',
        yellow: '#f59e0b',
        'yellow-bg': '#0f0c00',
        'yellow-border': '#2a1e00',
        red: '#ef4444',
        'red-bg': '#0f0505',
        'red-border': '#2a0808',
      },
    },
  },
  plugins: [],
}
