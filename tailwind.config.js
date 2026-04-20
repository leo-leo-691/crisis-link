/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        emergency: '#E63946',
        navy:      '#0A0E1A',
        steelblue: '#457B9D',
        surface:   '#141929',
        card:      '#1E2640',
        critical:  '#FF0033',
        high:      '#F4A261',
        medium:    '#FACC15',
        resolved:  '#2DC653',
        muted:     '#8B9CB6',
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.215,0.61,0.355,1) infinite',
        'count-up': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(230,57,70,0.4)',
        'glow-orange': '0 0 16px rgba(244,162,97,0.3)',
        'glow-blue':   '0 0 14px rgba(69,123,157,0.3)',
      },
    },
  },
  plugins: [],
};
