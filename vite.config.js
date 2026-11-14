import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset + data paths relative, so the built site works on
// GitHub Pages (user.github.io/repo-name/), Netlify, or opened from any folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  // stamped into data URLs so each deploy fetches fresh JSON instead of a cached copy
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  test: { environment: 'jsdom', globals: true },
});
