import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(dirname, './src') },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['src/test/**', '**/*.stories.*', 'src/lib/database.types.ts'],
        },
    },
});
