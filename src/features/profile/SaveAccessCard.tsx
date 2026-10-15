import { TextInput, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { Button, Card, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useSaveAccess } from './useSaveAccess';

/**
 * "Guardá tu acceso" · para quien entró por una invitación SIN email (10/10).
 *
 * Sin email no hay cómo volver a entrar: si cambia de teléfono o borra la
 * app, pierde su lugar. Esto vincula un email al MISMO usuario, sin perder
 * nada (espacio, autoría, nombre). Nunca insiste: es una tarjeta, no un
 * bloqueo (mismo criterio que §33 U1 con "Tu plata personal").
 *
 * La lógica vive en useSaveAccess, que comparte con el flujo guiado hacia la
 * cuenta personal (onboarding/guardar-acceso).
 */
export function SaveAccessCard() {
  const theme = useTheme();
  const access = useSaveAccess();

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
          {access.step === 'email'
            ? 'Entraste sin email. Si cambiás de teléfono o borrás la app, lo vas a necesitar para volver a tu espacio. Nadie más lo ve.'
            : `Te mandamos un código a ${access.normalizedEmail}. Escribilo acá.`}
        </Text>

        {access.step === 'email' ? (
          <View style={inputStyle}>
            <TextInput
              value={access.email}
              onChangeText={access.setEmail}
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
                theme.typography.bodyMedium,
                { color: theme.colors.text, textAlign: 'center', letterSpacing: 4 },
              ]}
            />
          </View>
        )}

        {access.error != null && (
          <Text variant="small" tone="danger">
            {access.error}
          </Text>
        )}

        {access.step === 'email' ? (
          <Button
            label="Enviarme el código"
            fullWidth
            loading={access.busy}
            disabled={!access.emailLooksValid}
            onPress={() => void access.sendCode()}
          />
        ) : (
          <Stack gap="2">
            <Button
              label="Guardar mi acceso"
              fullWidth
              loading={access.busy}
              disabled={!access.codeComplete}
              onPress={() => void access.confirm()}
            />
            <Button label="Usar otro email" variant="ghost" fullWidth onPress={access.backToEmail} />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
