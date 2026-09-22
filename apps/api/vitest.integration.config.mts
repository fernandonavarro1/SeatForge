import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests against a real PostgreSQL started by Testcontainers.
 *
 * One container is started once in globalSetup and its connection URI is
 * handed to every test file through Vitest's typed `inject`. Starting a
 * container per file would be far too slow and would thrash Docker.
 *
 * fileParallelism stays off so concurrency tests control their own
 * interleaving rather than competing with unrelated test files for
 * connections and row locks.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['test/**/*.int-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
