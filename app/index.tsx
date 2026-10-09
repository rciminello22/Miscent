import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { useTheme } from '@/ui/theme';

/**
 * La ruta raíz.
 *
 * Existe porque expo-router necesita que ALGO responda a "/": el RouteGuard
 * del layout redirige, pero lo hace en un efecto, y para cuando corre el
 * router ya decidió que la ruta no existe y muestra "Unmatched Route".
 *
 * Acá el redirect es declarativo, así que ocurre en el mismo render.
 *
 * §14 · los tres destinos son los tres estados de cuenta:
 *   signed-out → el onboarding
 *   guest      → sus espacios, sin pestañas (K0, CA-06)
 *   personal   → Inicio
 */
export default function Index() {
  const { accountState } = useSession();
  const theme = useTheme();

  if (accountState === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (accountState === 'signed-out') return <Redirect href="/(auth)/bienvenida" />;
  if (accountState === 'guest') return <Redirect href="/(guest)/espacios" />;
  return <Redirect href="/(personal)/inicio" />;
}
