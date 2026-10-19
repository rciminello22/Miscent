import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { resolveScheme } from './appearance';
import { useAppearance } from './appearanceStore';
import { colorSchemes, radius, space, typography, type ColorSchemeName, type ThemeColors } from './tokens';

/**
 * Tema. Por defecto ("Automático") sigue el ajuste del sistema (claro/oscuro),
 * así nadie tiene que configurar nada; en Perfil → Apariencia se puede fijar
 * Claro u Oscuro. La elección se resuelve acá, en el provider, y no con
 * `Appearance.setColorScheme`: no depende del comportamiento nativo de Expo Go
 * y la barra de estado y los tests ven el mismo esquema que el resto de la app.
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
  const { preference } = useAppearance();
  const scheme: ColorSchemeName = resolveScheme(preference, systemScheme);

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
