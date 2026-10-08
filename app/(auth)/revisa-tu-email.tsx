import { useState } from 'react';
import { View } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { sendMagicLink } from '@/data/auth';
import { Button, Pressable, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 paso 4, después de enviar · "Te mandamos un enlace a tu email para
 * entrar."
 *
 * Esta pantalla no tiene un botón de "continuar" porque no hay nada que
 * continuar desde la app: el usuario se va al mail y vuelve por el deep link,
 * que lo atiende MagicLinkListener en el layout raíz.
 *
 * §13 · "Enlace vencido: 'Pedí uno nuevo'" — de ahí el reenvío.
 */
export default function RevisaTuEmail() {
  const theme = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    if (email == null || resending) return;
    setResending(true);
    setError(null);

    const result = await sendMagicLink(email);
    setResending(false);

    if (result.status === 'error') setError(result.message);
    else setResent(true);
  }

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="5">
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MailCheck size={22} color={theme.colors.brand} />
            </View>

            <Stack gap="3">
              <Text variant="title">Revisá tu email</Text>
              <Text variant="body" tone="secondary">
                Te mandamos un enlace a{' '}
                <Text variant="bodyMedium">{email ?? 'tu email'}</Text> para entrar.
                Abrilo desde este teléfono.
              </Text>
            </Stack>
          </Stack>
        </Animated.View>

        <Stack gap="4">
          <Button
            label={resent ? 'Enlace reenviado' : 'Enviar otro enlace'}
            variant="secondary"
            size="lg"
            fullWidth
            loading={resending}
            disabled={resent}
            onPress={() => void resend()}
          />

          {error != null && (
            <Animated.View entering={FadeIn.duration(duration.quick)}>
              <Text variant="small" tone="excess">
                {error}
              </Text>
            </Animated.View>
          )}

          <Pressable onPress={() => router.back()} haptic="none">
            <Text variant="small" tone="brand" align="center">
              Usar otro email
            </Text>
          </Pressable>
        </Stack>
      </Stack>
    </Screen>
  );
}
