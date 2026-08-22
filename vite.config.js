import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vercel serves the site from the domain root, GitHub Pages serves it under
  // /simple-board/ — Vercel sets a VERCEL=1 env var during its build, so pick
  // the right base automatically without breaking either deployment.
  base: process.env.VERCEL ? '/' : '/simple-board/'
});
