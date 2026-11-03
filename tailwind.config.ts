import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        dark: {
          primary: '#6c5ce7',
          'primary-content': '#ffffff',
          secondary: '#a29bfe',
          accent: '#00d4aa',
          neutral: '#252541',
          'base-100': '#0f0f1e',
          'base-200': '#1a1a2e',
          'base-300': '#252541',
          'base-content': '#ffffff',
          info: '#6c5ce7',
          success: '#00d4aa',
          warning: '#feca57',
          error: '#ff6b9d'
        },
        light: {
          primary: '#5e4db2',
          'primary-content': '#ffffff',
          secondary: '#8b7fc7',
          accent: '#0a9d6a',
          neutral: '#eceef4',
          'base-100': '#f4f5f9',
          'base-200': '#ffffff',
          'base-300': '#eceef4',
          'base-content': '#1d1d1f',
          info: '#5e4db2',
          success: '#0a9d6a',
          warning: '#d97706',
          error: '#e63946'
        },
        ocean: {
          primary: '#00b4d8',
          'primary-content': '#04121f',
          secondary: '#48cae4',
          accent: '#06ffa5',
          neutral: '#1e4976',
          'base-100': '#0a1929',
          'base-200': '#132f4c',
          'base-300': '#1e4976',
          'base-content': '#e8f4f8',
          info: '#00b4d8',
          success: '#06ffa5',
          warning: '#ffbe0b',
          error: '#ff006e'
        },
        forest: {
          primary: '#52b788',
          'primary-content': '#06130b',
          secondary: '#74c69d',
          accent: '#a7c957',
          neutral: '#2d4a2d',
          'base-100': '#0d1b0d',
          'base-200': '#1a2f1a',
          'base-300': '#2d4a2d',
          'base-content': '#f1faee',
          info: '#52b788',
          success: '#a7c957',
          warning: '#f4a261',
          error: '#e63946'
        },
        sunset: {
          primary: '#ff6b9d',
          'primary-content': '#2a0a14',
          secondary: '#ffa6c1',
          accent: '#06ffa5',
          neutral: '#4a2c3a',
          'base-100': '#1a0f14',
          'base-200': '#2d1b24',
          'base-300': '#4a2c3a',
          'base-content': '#fff5f7',
          info: '#ff6b9d',
          success: '#06ffa5',
          warning: '#ffbe0b',
          error: '#ff4d6d'
        },
        midnight: {
          primary: '#ffffff',
          'primary-content': '#000000',
          secondary: '#e0e0e0',
          accent: '#00ff88',
          neutral: '#1a1a1a',
          'base-100': '#000000',
          'base-200': '#0d0d0d',
          'base-300': '#1a1a1a',
          'base-content': '#ffffff',
          info: '#ffffff',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444'
        }
      }
    ]
  }
} satisfies Config;
