import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/ui/theme';

/**
 * Render con los providers mínimos.
 *
 * Solo tema y safe area: ni sesión ni queries. Los componentes de esta app
 * reciben los datos por props y el cálculo viene del dominio, así que para
 * verificar qué dice una pantalla no hace falta montar media app. Si un
 * componente necesitara sesión o red para renderizar su texto, sería señal de
 * que tiene demasiadas responsabilidades.
 *
 * `render` es ASYNC desde RNTL 14, así que este helper también lo es y hay que
 * esperarlo. Olvidarse del await da el error "render function has not been
 * called", que no dice nada sobre la causa real.
 */

const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

export function renderWithTheme(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    ),
    ...options,
  });
}

export * from '@testing-library/react-native';
