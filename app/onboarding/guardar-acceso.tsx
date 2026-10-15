import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StepShell } from '@/features/onboarding/StepShell';
import { useSaveAccess } from '@/features/profile/useSaveAccess';
import { goBack } from '@/features/shared/navigation';
import { Button, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * El tramo que faltaba entre "Crear mi cuenta personal" y la cuenta, para
 * quien entró por una invitación sin email (10/10).
 *
 * Antes: "Crear mi cuenta personal" → "primero guardá tu acceso" → Perfil →
 * guardaba el email → y ahí se cortaba: tenía que volver a buscar el botón.
 * Ahora es un solo camino guiado, en el formato del onboarding, una pregunta
 * por pantalla (principio 9): email → código → la cuenta personal (O3).
 *
 * Sin email no hay cuenta personal (migración 0006): se perdería con el
 * teléfono.
 */
export default function GuardarAcceso() {
  const theme = useTheme();
  const router = useRouter();
  // Con el email guardado, sigue O3. La marca evita una carrera: la sesión
  // nueva (no anónima) llega por un evento, y si la pantalla siguiente la
  // mirara antes, mandaría de vuelta acá.
  const access = useSaveAccess(() =>
    router.replace({ pathname: '/onboarding/cuenta-personal', params: { accesoGuardado: '1' } }),
  );

  const inputStyle = {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space['4'],
    height: 54,
    justifyContent: 'center' as const,
  };

  if (access.step === 'email') {
    return (
      <StepShell
        step={1}
        total={2}
        title="Primero, guardá tu acceso"
        description="Tu cuenta personal va a tener tus ingresos y tus gastos propios. Con tu email no la perdés si cambiás de teléfono."
        help="Nadie más ve tu email: en tus espacios se sigue viendo solo tu nombre."
        continueLabel="Enviarme el código"
        continueDisabled={!access.emailLooksValid}
        saving={access.busy}
        onContinue={() => void access.sendCode()}
        onSkip={() => goBack(router)}
        skipLabel="Ahora no"
      >
        <Stack gap="3">
          <View style={inputStyle}>
            <TextInput
              value={access.email}
              onChangeText={access.setEmail}
              onSubmitEditing={() => void access.sendCode()}
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
          {access.error != null && (
            <Text variant="small" tone="danger">
              {access.error}
            </Text>
          )}
        </Stack>
      </StepShell>
    );
  }

  return (
    <StepShell
      step={2}
      total={2}
      title="Revisá tu email"
      description={`Te mandamos un código a ${access.normalizedEmail}.`}
      continueLabel="Confirmar"
      continueDisabled={!access.codeComplete}
      saving={access.busy}
      onContinue={() => void access.confirm()}
    >
      <Stack gap="3">
        <View style={{ ...inputStyle, height: 60, paddingHorizontal: 0 }}>
          <TextInput
            value={access.code}
            onChangeText={access.setCode}
            placeholder="12345678"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            accessibilityLabel="Código del email"
            style={[
              theme.typography.title,
              { color: theme.colors.text, textAlign: 'center', letterSpacing: 6 },
            ]}
          />
        </View>
        {access.error != null && (
          <Text variant="small" tone="danger">
            {access.error}
          </Text>
        )}
        <Button
          label="Usar otro email"
          variant="ghost"
          fullWidth
          haptic="none"
          onPress={access.backToEmail}
        />
      </Stack>
    </StepShell>
  );
}
