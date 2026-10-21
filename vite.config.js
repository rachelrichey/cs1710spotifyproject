import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset + data paths relative, so the built site works on
// GitHub Pages (user.github.io/repo-name/), Netlify, or opened from any folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
});
