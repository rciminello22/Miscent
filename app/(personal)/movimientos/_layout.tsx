import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * La pestaña Movimientos es un stack de una sola pantalla: los detalles se
 * abren fuera de las pestañas (`/movimiento`, `/space/...`, `/historial/...`).
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
