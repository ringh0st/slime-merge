import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Relative base so the build works on GitHub Pages under /<repo>/.
export default defineConfig({
  plugins: [
    react(),
    // The published game's version on its own, so an open copy can find out it is old (see src/update.js).
    {
      name: 'version-file',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version }),
        });
      },
    },
  ],
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
});
