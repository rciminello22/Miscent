import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * §14 Estado B · usuario sin cuenta personal.
 *
 * "Barra inferior: NO HAY; no se muestran pestañas que no puede usar."
 *
 * Eso es lo que hace este layout, y es la diferencia entre respetar K0 y
 * traicionarlo: el invitado no ve un Estado A recortado. Ve su app, completa,
 * con lo que sí puede hacer. Sin candados, sin "cuenta incompleta", sin
 * "desbloqueá" (§33 U1).
 */
export default function GuestLayout() {
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
