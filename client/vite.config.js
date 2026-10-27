import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Prebundle React and its ESM importers so browsers don't receive React's
  // CommonJS entry point as a native module (which has no named exports).
  ...(command === 'serve' ? {
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom/client', 'react-router-dom', 'lucide-react']
    }
  } : {}),
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
  preview: { port: 4173 }
}));
