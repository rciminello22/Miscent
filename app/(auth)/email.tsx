import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { sendMagicLink } from '@/data/auth';
import {
  forgetOnboardingIntent,
  rememberOnboardingIntent,
  type OnboardingIntent,
} from '@/features/auth/onboardingIntent';
import { Button, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 paso 4 · "Registro: email → enlace mágico, sin contraseña" [P1].
 *
 * CA-49 · no hay campo de contraseña en ningún lugar de la app.
 *
 * Desde el 9/10 la bienvenida separa "Empezar" de "Ya tengo cuenta": con un
 * solo camino, un usuario que volvía tenía que elegir qué quería hacer
 * primero, y esa elección quedaba guardada para el próximo usuario nuevo.
 */

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Por dónde llegó la persona, que decide qué se crea:
 *   signup · "Empezar"            → usuario nuevo CON cuenta personal (O1 5a)
 *   invite · una invitación (O2)  → usuario nuevo SIN cuenta personal (A-03)
 *   login  · "Ya tengo cuenta"    → no se crea nada; si no existe, se avisa
 */
type Mode = 'signup' | 'invite' | 'login';

const INTENTS: readonly string[] = ['personal', 'shared', 'both'];

export default function Email() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string; mode?: string }>();

  const intent =
    params.intent != null && INTENTS.includes(params.intent)
      ? (params.intent as OnboardingIntent)
      : null;
  const mode: Mode = intent != null ? 'signup' : params.mode === 'login' ? 'login' : 'invite';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const valid = looksLikeEmail(email);

  async function submit() {
    if (!valid || sending) return;
    setSending(true);
    setError(null);

    // §13 O1 paso 5a / A-03 · la elección de "Empezar" activa la cuenta
    // personal, y queda atada a ESTE email. Por cualquier otro camino no
    // puede sobrevivir ninguna elección anterior.
    if (intent != null) await rememberOnboardingIntent(email, intent);
    else await forgetOnboardingIntent();

    const result = await sendMagicLink(email, { createUser: mode !== 'login' });
    setSending(false);

    if (result.status === 'error') {
      setError(result.message);
      return;
    }

    router.push({
      pathname: '/(auth)/revisa-tu-email',
      params: { email: email.trim().toLowerCase(), mode },
    });
  }

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="3">
            <Text variant="title">
              {mode === 'login' ? 'Entrá con tu email' : '¿Cuál es tu email?'}
            </Text>
            <Text variant="body" tone="secondary">
              Te mandamos un código y un enlace para entrar. Sin contraseñas.
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
          label="Enviarme el código"
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
