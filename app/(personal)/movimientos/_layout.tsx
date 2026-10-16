// TEMPORAL: variante B en prueba. Si gana la A, este stack se vuelve a un solo archivo
// (app/(personal)/movimientos.tsx) y se borra la carpeta.
import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * La pestaña Movimientos es un stack: en la variante B la lista vive en una
 * pantalla propia (N3) DENTRO de la pestaña, y la barra queda visible, igual que
 * Compartidos.
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
