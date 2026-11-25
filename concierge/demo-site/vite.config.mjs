import { fileURLToPath } from 'node:url';

// Serves the fictional spa website on its own origin, so the widget embeds cross-origin
// exactly as it will on a client's real site.
export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { port: 5180, strictPort: true },
};
