import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// The widget is served from chat.<client domain> in production, with /api routed to the
// backend by CloudFront (D7). Locally, Vite plays that role by proxying /api.
export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: { target: 'es2020' },
});
