import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'codeappscompact': resolve(import.meta.dirname, 'src', 'index.tsx'),
    },
  },
  build: { outDir: 'demo-dist' },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(import.meta.dirname, 'tests', 'setup.ts')],
    testTimeout: 6000,
    fileParallelism: false,
  },
});
