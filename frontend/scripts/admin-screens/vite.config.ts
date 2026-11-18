// Local screenshot harness only (sample data, no Firebase). Never built or published.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 4190, strictPort: true },
});
