import { ActivityIndicator } from 'react-native';
import { Button, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * Lo que ve el usuario al volver del email (P1).
 *
 * Presentacional: recibe el estado y no sabe de sesión, router ni Supabase.
 * La pantalla que la usa (app/auth/callback.tsx) decide cuándo redirigir.
 */
export function MagicLinkStatusView({
  status,
  onRetry,
}: {
  status: { kind: 'pending' } | { kind: 'failed'; message: string };
  onRetry: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen scroll={false} contentStyle={{ flex: 1, justifyContent: 'center' }}>
      {status.kind === 'pending' ? (
        <Stack gap="4" style={{ alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
          <Text variant="body" tone="secondary">
            Entrando…
          </Text>
        </Stack>
      ) : (
        <Stack gap="6">
          <Text variant="heading">No pudimos entrar</Text>
          <Text variant="body" tone="secondary">
            {status.message}
          </Text>
          <Button label="Pedir un enlace nuevo" size="lg" fullWidth onPress={onRetry} />
        </Stack>
      )}
    </Screen>
  );
}
