import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * La pestaña Futuro es un stack: el N1 con sus puertas y, adentro de la
 * pestaña, el detalle de cada una (Próximos pagos, Tus cuotas). La barra queda
 * visible, igual que en Compartidos.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function FuturoLayout() {
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
