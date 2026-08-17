import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy the API to Django so the browser sees a single origin.
      // CORS never enters the picture in development because of this.
      //
      // Port 8001, not Django's default 8000: another project on this machine
      // already listens there. If /api ever reaches the wrong server you get
      // an HTML error page instead of JSON. Keep in step with BACKEND_PORT
      // in start.sh.
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.BACKEND_PORT ?? 8001}`,
          changeOrigin: true,
        },
        '/media': {
          target: `http://localhost:${process.env.BACKEND_PORT ?? 8001}`,
          changeOrigin: true,
        },
      },
    },
  };
});
