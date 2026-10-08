import { defineConfig } from 'vitest/config';


/**
 * El dominio es TypeScript puro: no necesita el preset de React Native.
 * Por eso corre en Node y el ciclo de feedback es de milisegundos, que es
 * lo que permite iterar sobre T-03, Q-08, S-02 y N-04 sin abrir un emulador.
 *
 * Los tests de componentes (nivel 3) se agregan en la Fase 3 con jest-expo,
 * porque RNTL necesita el preset de React Native.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/domain/**/*.test.ts', 'src/lib/**/*.test.ts', 'tools/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@domain': new URL('./src/domain', import.meta.url).pathname,
    },
  },
});
