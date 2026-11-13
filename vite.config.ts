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
      watch: {
        ignored: [
          '**/data/**',
          '**/uploads/**',
          '**/.system_generated/**',
          '**/*.log',
          '**/*.wt',
          '**/*.turtle',
          '**/journal/**',
          '**/diagnostic.data/**',
        ],
      },
    },
  };
});
