/**
 * Setup de los tests de componentes.
 *
 * Lo que se mockea acá es lo que toca el sistema operativo o la red. Nada de
 * la lógica del producto: el dominio corre de verdad, porque la mitad del
 * valor de estos tests es comprobar que la pantalla muestra lo que el dominio
 * calculó, no un número inventado en el test.
 */

/* Reanimated: el mock oficial deja las animaciones en su estado final, que
   es justo lo que un test de texto quiere ver. En la version 4 se aplica con
   jest.mock y no con setUpTests, que era de la 3. */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

/*
 * lucide-react-native se distribuye como ESM y jest no lo transforma. Los
 * iconos no tienen texto que verificar, asi que se reemplazan por un stub:
 * un Proxy que devuelve un componente vacio para cualquier nombre.
 */
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === '__esModule') return true;
        const Icon = (props) => React.createElement(View, props);
        Icon.displayName = String(name);
        return Icon;
      },
    },
  );
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/* Las fuentes son archivos binarios: en un test no aportan nada. */
jest.mock('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf', () => 'Inter_400Regular');
jest.mock('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf', () => 'Inter_500Medium');
jest.mock(
  '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
  () => 'Inter_600SemiBold',
);

/* Silencia el aviso de useNativeDriver, que en jsdom no aplica. */
jest.spyOn(console, 'warn').mockImplementation((message) => {
  if (typeof message === 'string' && message.includes('useNativeDriver')) return;
});
