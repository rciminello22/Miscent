import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * O3 · activación de la cuenta personal (§13).
 *
 * "Cada paso se puede saltear y completar después." Por eso cada pantalla
 * guarda lo suyo al avanzar, en vez de acumular todo y escribir al final: si
 * alguien abandona en el paso 4, lo que cargó en el 2 y el 3 ya está.
 */
export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
