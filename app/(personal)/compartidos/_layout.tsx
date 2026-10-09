import { Stack } from 'expo-router';
import { useTheme } from '@/ui/theme';

/**
 * La pestaña Compartidos es un stack: la lista y cada espacio viven ADENTRO
 * de la pestaña, así la barra queda visible también dentro de un espacio
 * (decisión del 9/10). Solo para el Estado A: el invitado ve su espacio en
 * /space/[id], sin pestañas (CA-06).
 */
// Un espacio abierto desde otra pestaña (Movimientos, Inicio) tiene la lista
// debajo: "Volver" siempre tiene a dónde ir dentro de Compartidos.
export const unstable_settings = { initialRouteName: 'index' };

export default function CompartidosLayout() {
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
