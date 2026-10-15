import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { sendMagicLink, verifyEmailCode } from '@/data/auth';
import { normalizeOtp, OTP_LENGTH } from '@/data/authErrors';
import { Button, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 paso 4, después de enviar.
 *
 * Decisión del 9/10 (etapa de testeo, revisar antes de producción): el mismo
 * mail trae un código de 8 dígitos y el enlace. El código se escribe acá y
 * entra sin depender de que el enlace se abra bien; el enlace sigue
 * funcionando por MagicLinkListener.
 *
 * §13 · "Enlace vencido: 'Pedí uno nuevo'" — de ahí el reenvío.
 */
export default function RevisaTuEmail() {
  const theme = useTheme();
  const router = useRouter();
  const { email, mode } = useLocalSearchParams<{ email?: string; mode?: string }>();

  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(value: string) {
    if (email == null || value.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    setError(null);

    const result = await verifyEmailCode(email, value);
    setVerifying(false);

    if (!result.ok) setError(result.message);
    // Con la sesión lista, el RouteGuard lleva al árbol que corresponde (§14)
    // y limpia el historial: esta pantalla no queda debajo de la app.
  }

  function onChangeCode(input: string) {
    const next = normalizeOtp(input);
    setCode(next);
    setError(null);
    if (next.length === OTP_LENGTH) void verify(next);
  }

  async function resend() {
    if (email == null || resending) return;
    setResending(true);
    setError(null);

    // "Ya tengo cuenta" no crea usuarios, tampoco al reenviar.
    const result = await sendMagicLink(email, { createUser: mode !== 'login' });
    setResending(false);

    if (result.status === 'error') setError(result.message);
    else setResent(true);
  }

  return (
    <Screen
      footer={
        // Sobre el teclado numérico: el código se ve mientras se escribe.
        <Button
          label="Entrar"
          size="lg"
          fullWidth
          loading={verifying}
          disabled={code.length !== OTP_LENGTH}
          onPress={() => void verify(code)}
        />
      }
    >
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
                Te mandamos un código a{' '}
                <Text variant="bodyMedium">{email ?? 'tu email'}</Text>. Escribilo acá, o
                tocá el enlace del mail desde este teléfono.
              </Text>
            </Stack>
          </Stack>
        </Animated.View>

        <Stack gap="3">
          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: focused ? theme.colors.brand : theme.colors.border,
              backgroundColor: theme.colors.surface,
              height: 60,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={code}
              onChangeText={onChangeCode}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="12345678"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={OTP_LENGTH + 4}
              accessibilityLabel="Código del email"
              style={[
                theme.typography.title,
                { color: theme.colors.text, textAlign: 'center', letterSpacing: 6 },
              ]}
            />
          </View>

          {error != null && (
            <Animated.View entering={FadeIn.duration(duration.quick)}>
              <Text variant="small" tone="danger">
                {error}
              </Text>
            </Animated.View>
          )}
        </Stack>

        <Stack gap="4">
          <Button
            label={resent ? 'Código reenviado' : 'Enviar otro código'}
            variant="secondary"
            fullWidth
            loading={resending}
            disabled={resent}
            onPress={() => void resend()}
          />

          <Button
            label="Usar otro email"
            variant="ghost"
            fullWidth
            haptic="none"
            onPress={() => goBack(router)}
          />
        </Stack>
      </Stack>
    </Screen>
  );
}
