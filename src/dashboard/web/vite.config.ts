import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Built into the compiled server's sibling `public/` dir so `codegraph
// dashboard` can serve it from `dist/dashboard/public`. `base: './'` keeps
// asset URLs relative so it works regardless of the host/port it's served on.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../../../dist/dashboard/public'),
    emptyOutDir: true,
  },
  server: {
    // `npm run dev` (or `codegraph dashboard --dev`) proxies the API to a
    // locally-running dashboard API server. `codegraph dashboard --dev` injects
    // CODEGRAPH_DASHBOARD_API so the proxy follows a non-default --port;
    // standalone `npm run dev` falls back to the default 4319.
    proxy: {
      '/api': process.env.CODEGRAPH_DASHBOARD_API || 'http://127.0.0.1:4319',
    },
  },
});
