/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        toss: {
          bg: 'rgb(var(--toss-bg) / <alpha-value>)',
          surface: 'rgb(var(--toss-surface) / <alpha-value>)',
          surfaceHover: 'rgb(var(--toss-surfaceHover) / <alpha-value>)',
          selected: 'rgb(var(--toss-selected) / <alpha-value>)',
          blue: 'rgb(var(--toss-blue) / <alpha-value>)',
          onPrimary: 'rgb(var(--toss-onPrimary) / <alpha-value>)',
          green: 'rgb(var(--toss-green) / <alpha-value>)',
          yellow: 'rgb(var(--toss-yellow) / <alpha-value>)',
          red: 'rgb(var(--toss-red) / <alpha-value>)',
          textMain: 'rgb(var(--toss-textMain) / <alpha-value>)',
          textSub: 'rgb(var(--toss-textSub) / <alpha-value>)',
          divider: 'rgb(var(--toss-divider) / <alpha-value>)',
          overlay: 'rgb(var(--toss-overlay) / <alpha-value>)',
        },
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(15, 23, 42, 0.18)',
        focus: '0 0 24px rgba(49,130,246,0.32), 0 0 96px rgba(49,130,246,0.18)',
        warning: '0 0 18px rgba(245,166,35,0.24), 0 0 48px rgba(245,166,35,0.12)',
        success: '0 0 20px rgba(26,201,126,0.28), 0 0 72px rgba(26,201,126,0.16)',
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        timer: ['6rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      zIndex: {
        base: '0',
        dropdown: '100',
        sticky: '200',
        overlay: '300',
        modal: '400',
        toast: '500',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms ease-out both',
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};
