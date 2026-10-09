import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * O2 · la entrada de un invitado.
 *
 * Vive fuera de los tres arboles porque se abre ANTES de tener sesion: el
 * enlace llega por WhatsApp y la persona todavia no es usuaria de la app.
 */
export default function InviteLayout() {
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
