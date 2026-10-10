import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { confirmSavingAccess, startSavingAccess } from '@/data/auth';
import { normalizeOtp, OTP_LENGTH } from '@/data/authErrors';
import { Button, Card, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * "Guardá tu acceso" · para quien entró por una invitación SIN email (10/10).
 *
 * Sin email no hay cómo volver a entrar: si cambia de teléfono o borra la
 * app, pierde su lugar. Esto vincula un email al MISMO usuario, sin perder
 * nada (espacio, autoría, nombre). Nunca insiste: es una tarjeta, no un
 * bloqueo (mismo criterio que §33 U1 con "Tu plata personal").
 */
export function SaveAccessCard() {
  const theme = useTheme();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function sendCode() {
    if (!emailLooksValid || busy) return;
    setBusy(true);
    setError(null);
    const result = await startSavingAccess(email);
    setBusy(false);
    if (result.ok) setStep('code');
    else setError(result.message);
  }

  async function confirm(value: string) {
    if (value.length !== OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const result = await confirmSavingAccess(email, value);
    setBusy(false);
    // Si sale bien, la sesión se actualiza sola (USER_UPDATED) y esta tarjeta
    // deja de mostrarse.
    if (!result.ok) setError(result.message);
  }

  const inputStyle = {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space['4'],
    height: 50,
    justifyContent: 'center' as const,
  };

  return (
    <Card tone="brand">
      <Stack gap="4">
        <Row gap="3" align="center">
          <KeyRound size={18} color={theme.colors.brand} />
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            Guardá tu acceso
          </Text>
        </Row>

        <Text variant="small" tone="secondary">
          {step === 'email'
            ? 'Entraste sin email. Si cambiás de teléfono o borrás la app, lo vas a necesitar para volver a tu espacio. Nadie más lo ve.'
            : `Te mandamos un código a ${email.trim().toLowerCase()}. Escribilo acá.`}
        </Text>

        {step === 'email' ? (
          <View style={inputStyle}>
            <TextInput
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setError(null);
              }}
              placeholder="vos@email.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              accessibilityLabel="Tu email"
              style={[theme.typography.body, { color: theme.colors.text }]}
            />
          </View>
        ) : (
          <View style={inputStyle}>
            <TextInput
              value={code}
              onChangeText={(input) => {
                const next = normalizeOtp(input);
                setCode(next);
                setError(null);
                if (next.length === OTP_LENGTH) void confirm(next);
              }}
              placeholder="12345678"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              accessibilityLabel="Código del email"
              style={[
                theme.typography.bodyMedium,
                { color: theme.colors.text, textAlign: 'center', letterSpacing: 4 },
              ]}
            />
          </View>
        )}

        {error != null && (
          <Text variant="small" tone="excess">
            {error}
          </Text>
        )}

        {step === 'email' ? (
          <Button
            label="Enviarme el código"
            fullWidth
            loading={busy}
            disabled={!emailLooksValid}
            onPress={() => void sendCode()}
          />
        ) : (
          <Stack gap="2">
            <Button
              label="Guardar mi acceso"
              fullWidth
              loading={busy}
              disabled={code.length !== OTP_LENGTH}
              onPress={() => void confirm(code)}
            />
            <Button
              label="Usar otro email"
              variant="ghost"
              fullWidth
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
