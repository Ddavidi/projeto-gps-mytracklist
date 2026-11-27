import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Todos os arquivos usam o mesmo banco de teste: rodar um de cada vez evita interferência.
    fileParallelism: false,
    hookTimeout: 30000,
  },
});
