import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 규칙 백과사전 (단독 앱). 나중에 packages/client 로 옮긴다
export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: { port: 5200 },
  preview: { port: 5200 },
});
