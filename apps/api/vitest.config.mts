import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests.
 *
 * SWC rather than the default esbuild transform: esbuild does not implement
 * emitDecoratorMetadata, so NestJS could not resolve @Injectable constructors.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', '**/*.spec.ts'],
    },
  },
});
