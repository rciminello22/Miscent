import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * Seccion 16 · el detalle de un movimiento, con Editar y Eliminar.
 */
export default function MovimientoLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_bottom',
      }}
    />
  );
}
