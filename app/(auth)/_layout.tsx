import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * O1 · onboarding de usuario nuevo, y O2 · entrada de un invitado.
 *
 * Cada paso se puede saltear y completar después (§13), así que es un stack
 * con animación horizontal: el usuario siempre sabe que puede volver.
 */
export default function AuthLayout() {
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
