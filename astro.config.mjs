import {defineConfig} from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  integrations: [react()],
  devToolbar: {enabled:false},
  vite: { build: { chunkSizeWarningLimit: 1000 } },
});
