import type { Config } from 'tailwindcss';
import uiPreset from '@repo/ui/tailwind.config';

const config = {
  presets: [uiPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;

export default config;
