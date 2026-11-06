import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  build:{rollupOptions:{input:{game:fileURLToPath(new URL('./index.html',import.meta.url)),designSystem:fileURLToPath(new URL('./design-system.html',import.meta.url)),foundations:fileURLToPath(new URL('./foundations.html',import.meta.url))}}},
  server: { port: 5173 },
});
