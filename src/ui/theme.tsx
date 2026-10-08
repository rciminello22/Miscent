import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colorSchemes, radius, space, typography, type ColorSchemeName, type ThemeColors } from './tokens';

/**
 * Tema. Sigue el ajuste del sistema (claro/oscuro) y no ofrece un selector
 * propio: una app de finanzas que se usa de noche en el sillón no tiene que
 * pedirle al usuario que configure nada.
 */

export type Theme = {
  scheme: ColorSchemeName;
  colors: ThemeColors;
  space: typeof space;
  radius: typeof radius;
  typography: typeof typography;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorSchemeName = systemScheme === 'dark' ? 'dark' : 'light';

  const theme = useMemo<Theme>(
    () => ({ scheme, colors: colorSchemes[scheme], space, radius, typography }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme == null) throw new Error('useTheme necesita un <ThemeProvider> arriba.');
  return theme;
}
