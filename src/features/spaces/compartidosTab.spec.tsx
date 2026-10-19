import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { ThemeProvider } from '@/ui/theme';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
import PersonalLayout from '../../../app/(personal)/_layout';
import CompartidosLayout from '../../../app/(personal)/compartidos/_layout';

/**
 * P23 · la pestaña Compartidos abre SIEMPRE en la lista. Antes quedaba con el
 * stack restaurado: crear un espacio, o abrir uno desde Inicio o Movimientos, y
 * volver a la pestaña la dejaba adentro del último espacio. Y un espacio abierto
 * desde otra pestaña no tenía la lista debajo.
 */

jest.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ accountState: 'personal' }),
}));

const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

function Inicio() {
  const openSpace = useOpenSpace();
  return (
    <Pressable onPress={() => openSpace('abc')} accessibilityRole="button">
      <Text>Abrir un espacio</Text>
    </Pressable>
  );
}

const screens = {
  '(personal)/_layout': PersonalLayout,
  '(personal)/inicio': Inicio,
  '(personal)/movimientos': () => <Text>Movimientos</Text>,
  '(personal)/futuro': () => <Text>Futuro</Text>,
  '(personal)/perfil': () => <Text>Perfil</Text>,
  '(personal)/compartidos/_layout': CompartidosLayout,
  '(personal)/compartidos/index': () => <Text>Lista de espacios</Text>,
  '(personal)/compartidos/[id]/index': () => <Text>Un espacio</Text>,
};

function renderApp(initialUrl: string) {
  return renderRouter(screens, {
    initialUrl,
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    ),
  });
}

/** Los nombres de las pantallas del stack de la pestaña Compartidos. */
function compartidosStack(view: ReturnType<typeof renderApp>): string[] | undefined {
  const root = view.getRouterState()?.routes[0]?.state?.routes[0]?.state;
  const tab = root?.routes.find((route) => route.name === 'compartidos');
  return tab?.state?.routes.map((route) => route.name);
}

describe('Pestaña Compartidos · siempre abre en la lista', () => {
  it('después de estar dentro de un espacio, volver a la pestaña muestra la lista', async () => {
    const view = renderApp('/inicio');
    await waitFor(() => expect(view.getPathname()).toBe('/inicio'));

    await fireEvent.press(screen.getByText('Abrir un espacio'));
    await waitFor(() => expect(view.getPathname()).toBe('/compartidos/abc'));
    // El espacio abierto desde otra pestaña tiene la lista debajo.
    expect(compartidosStack(view)).toEqual(['index', '[id]/index']);

    await fireEvent.press(screen.getByText('Inicio'));
    await waitFor(() => expect(view.getPathname()).toBe('/inicio'));

    await fireEvent.press(screen.getByText('Compartidos'));
    await waitFor(() => expect(view.getPathname()).toBe('/compartidos'));
  });
});
