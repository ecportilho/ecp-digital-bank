import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0f14',
        surface: '#131c28',
        'secondary-bg': '#0f1620',
        border: '#27364a',
        lime: {
          DEFAULT: '#b7ff2a',
          pressed: '#7ed100',
          dim: 'rgb(183 255 42 / 0.1)',
        },
        'text-primary': '#eaf2ff',
        'text-secondary': '#a9b7cc',
        'text-tertiary': '#7b8aa3',
        success: '#3dff8b',
        warning: '#ffcc00',
        danger: '#ff4d4d',
        info: '#4da3ff',
      },
      borderRadius: {
        card: '18px',
        control: '13px',
      },
      spacing: {
        inline: '8px',
        'card-gap': '16px',
        section: '32px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.35)',
        elevated: '0 8px 24px rgb(0 0 0 / 0.4)',
        modal: '0 20px 48px rgb(0 0 0 / 0.55)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
