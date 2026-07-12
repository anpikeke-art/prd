import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

const config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        border: 'var(--color-border)',
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          text: 'var(--color-accent-text)',
        },
        pastel: {
          red: 'var(--color-pastel-red-bg)',
          'red-text': 'var(--color-pastel-red-text)',
          blue: 'var(--color-pastel-blue-bg)',
          'blue-text': 'var(--color-pastel-blue-text)',
          green: 'var(--color-pastel-green-bg)',
          'green-text': 'var(--color-pastel-green-text)',
          yellow: 'var(--color-pastel-yellow-bg)',
          'yellow-text': 'var(--color-pastel-yellow-text)',
        },
      },
      borderRadius: {
        card: '12px',
        input: '6px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;

export default config;
