import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * §22 · las tarjetas de la cuenta personal, fuera del wizard de O3.
 */
export default function TarjetasLayout() {
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
