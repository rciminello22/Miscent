/**
 * Nivel 3 de testing · componentes.
 *
 * Convive con vitest y no lo reemplaza, porque prueban cosas distintas:
 *
 *   vitest (*.test.ts)  · el dominio y la lógica de presentación. TS puro,
 *                          corre en Node en ~600ms
 *   jest   (*.spec.tsx) · que las PANTALLAS digan lo que la spec exige.
 *                          Necesita el preset de React Native, así que es
 *                          inevitablemente más lento
 *
 * La separación por extensión evita que uno corra los tests del otro.
 *
 * ¿Por qué hace falta este nivel? Porque el lint de CA-00 verifica los
 * términos PROHIBIDOS, y hay criterios que exigen términos OBLIGATORIOS:
 * CA-01 pide que Sin asignar aparezca con "todavía sin destino, según lo que
 * registraste"; CA-52 pide una definición textual. Eso solo se puede verificar
 * renderizando.
 */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 corre sobre react-native-worklets, que trae su propio
  // resolver para jest: evita cargar los .native.ts, que necesitan el
  // modulo nativo (inexistente en un test).
  resolver: '<rootDir>/node_modules/react-native-worklets/jest/resolver.js',
  testMatch: ['**/*.spec.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|standard-navigation)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
  },
};
