import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * Seccion 21 · el detalle de un fijo y las cuatro formas de cambiarlo (F-03).
 */
export default function FijoLayout() {
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
