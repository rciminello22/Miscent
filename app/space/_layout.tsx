import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * §24 · el espacio compartido.
 *
 * Vive fuera de los arboles (personal) y (guest) porque la spec lo quiere
 * IGUAL en los dos estados: "igual para los dos miembros, en segunda persona;
 * igual en Estado A y B". Un invitado sin cuenta personal usa exactamente
 * esta pantalla, no una version recortada.
 */
export default function SpaceLayout() {
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
