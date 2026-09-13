import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { compilerOptions } from '../tsconfig.base.json';

// Use the same explicit aliases as TypeScript without creating a legacy Nx graph.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: Object.fromEntries(
      Object.entries(compilerOptions.paths).map(([name, paths]) => [
        name,
        resolve(import.meta.dirname, '..', paths[0]),
      ])
    ),
  },
  server: { port: 4200, host: 'localhost' },
  preview: { port: 4300, host: 'localhost' },
  build: {
    outDir: resolve(import.meta.dirname, '../dist/reference-react-app'),
    emptyOutDir: true,
  },
});
