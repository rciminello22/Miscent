import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * SA-02 · SA-05 · el detalle de solo lectura de un registro de un espacio del
 * que saliste. Vive fuera de las pestañas, como el detalle de un movimiento.
 */
export default function HistorialLayout() {
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
