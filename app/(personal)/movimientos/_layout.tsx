import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * La pestaña Movimientos es un stack: la lista vive en una pantalla propia (N3)
 * DENTRO de la pestaña, y la barra queda visible, igual que Compartidos.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function MovimientosLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
