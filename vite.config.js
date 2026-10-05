import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // loaded lazily from its own package; pre-bundling breaks its wasm/worker URLs
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
});
