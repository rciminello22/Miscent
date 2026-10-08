import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { sendMagicLink } from '@/data/auth';
import { rememberOnboardingIntent, type OnboardingIntent } from '@/features/auth/onboardingIntent';
import { Button, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 paso 4 · "Registro: email → enlace mágico, sin contraseña" [P1].
 *
 * CA-49 · no hay campo de contraseña en ningún lugar de la app.
 *
 * El mismo flujo sirve para registrarse y para volver a entrar: el usuario no
 * tiene que saber en cuál de los dos casos está, ni elegir entre dos botones.
 */

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export default function Email() {
  const theme = useTheme();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const valid = looksLikeEmail(email);

  async function submit() {
    if (!valid || sending) return;
    setSending(true);
    setError(null);

    // §13 O1 paso 5a / A-03 · el intent distingue el registro propio (que
    // activa la cuenta personal) de una invitacion (que no).
    if (intent != null) {
      await rememberOnboardingIntent(intent as OnboardingIntent);
    }

    const result = await sendMagicLink(email);
    setSending(false);

    if (result.status === 'error') {
      setError(result.message);
      return;
    }

    router.push({
      pathname: '/(auth)/revisa-tu-email',
      params: { email: email.trim().toLowerCase(), intent: intent ?? 'both' },
    });
  }

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="3">
            <Text variant="title">¿Cuál es tu email?</Text>
            <Text variant="body" tone="secondary">
              Te mandamos un enlace para entrar. Sin contraseñas.
            </Text>
          </Stack>
        </Animated.View>

        <Stack gap="3">
          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: focused ? theme.colors.brand : theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.space['4'],
              height: 54,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => void submit()}
              placeholder="vos@email.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              autoFocus
              returnKeyType="go"
              accessibilityLabel="Tu email"
              style={[theme.typography.body, { color: theme.colors.text }]}
            />
          </View>

          {error != null && (
            <Animated.View entering={FadeInDown.duration(duration.quick)}>
              <Text variant="small" tone="excess">
                {error}
              </Text>
            </Animated.View>
          )}
        </Stack>

        <Button
          label="Enviarme el enlace"
          size="lg"
          fullWidth
          disabled={!valid}
          loading={sending}
          onPress={() => void submit()}
        />
      </Stack>
    </Screen>
  );
}
