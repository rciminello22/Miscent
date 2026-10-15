import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
import { Users } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  acceptFailureMessage,
  acceptInvitation,
  type AcceptFailure,
} from '@/data/repositories/invitations';
import { rememberInvitationToken } from '@/features/auth/invitationToken';
import { forgetOnboardingIntent } from '@/features/auth/onboardingIntent';
import { signInAsGuest } from '@/data/auth';
import { useSession } from '@/features/auth/SessionProvider';
import { parseInvitationToken } from '@/features/auth/invitationLink';
import { Button, Card, Screen, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O2 · entrada de un invitado (§13).
 *
 * El punto más delicado del flujo: **aceptar una invitación NO activa una
 * cuenta personal** (A-03, I-07, CA-05). Quien entra por acá queda en Estado
 * B, que §10 define como "una forma completa y válida de usar la app".
 *
 * Y el paso 2 de O2 dice exactamente qué va a ver y qué va a ver el otro de
 * ella, ANTES de pedirle el email:
 *
 *   "Vas a ver los gastos de Casa, quién pagó y cómo están. Renzo va a ver lo
 *    que vos cargues en Casa. Nada más: ni tu plata ni la suya son parte de
 *    Casa."
 *
 * Si todavía no tiene sesión, el token se guarda y se acepta al volver del
 * enlace mágico.
 */
export default function Invite() {
  const theme = useTheme();
  const router = useRouter();
  const openSpace = useOpenSpace();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, refreshProfile } = useSession();

  const [name, setName] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ reason: AcceptFailure; spaceName?: string } | null>(
    null,
  );

  // Normaliza lo que llegue: codificado una vez, dos (enlaces viejos) o nada.
  // decodeURIComponent a secas explotaba con un "%" mal formado.
  const rawToken = parseInvitationToken(token ?? '') ?? '';

  async function accept() {
    if (rawToken === '') return;

    /**
     * Sin sesión: entra SIN email (decisión del 10/10, revisar antes de
     * producción). Se crea un usuario anónimo; la invitación, con el nombre
     * elegido, espera a que exista su perfil y la acepta PendingInvitation.
     * El email lo puede guardar después, desde su Perfil.
     *
     * A-03 · por una invitación se crea un usuario SIN cuenta personal: no
     * puede sobrevivir ninguna elección de "Empezar".
     */
    if (session == null) {
      setAccepting(true);
      setEntryError(null);
      await forgetOnboardingIntent();
      await rememberInvitationToken(rawToken, name);

      const result = await signInAsGuest();
      if (!result.ok) {
        setAccepting(false);
        setEntryError(result.message);
      }
      return;
    }

    setAccepting(true);
    setFailure(null);

    const result = await acceptInvitation(rawToken, name.trim() === '' ? undefined : name);
    setAccepting(false);

    if (!result.ok) {
      setFailure({ reason: result.reason, spaceName: result.spaceName });
      return;
    }

    // I-07 · no se activa ninguna cuenta personal. El RouteGuard la lleva al
    // Estado B, que es donde corresponde.
    await refreshProfile();
    openSpace(result.spaceId, 'replace', true);
  }

  if (failure != null) {
    return (
      <Screen>
        <Stack gap="7">
          <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
            <Stack gap="4">
              <Text variant="title">No pudimos abrir la invitación</Text>
              <Text variant="body" tone="secondary">
                {acceptFailureMessage(failure.reason, failure.spaceName)}
              </Text>
            </Stack>
          </Animated.View>

          <Button
            label="Entendido"
            size="lg"
            fullWidth
            onPress={() => router.replace(session == null ? '/(auth)/bienvenida' : '/')}
          />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        // Fijo abajo: con el teclado abierto para el nombre, se ve igual.
        <Button
          label={session == null ? 'Entrar al espacio' : 'Aceptar la invitación'}
          variant="shared"
          size="lg"
          fullWidth
          haptic="success"
          loading={accepting}
          disabled={session == null && name.trim() === ''}
          onPress={() => void accept()}
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
                backgroundColor: theme.colors.sharedSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} color={theme.colors.shared} />
            </View>

            <Stack gap="3">
              <Text variant="title">Te invitaron a un espacio compartido</Text>
              <Text variant="body" tone="secondary">
                Es un lugar para anotar los gastos que comparten, y que la app haga las
                cuentas.
              </Text>
            </Stack>
          </Stack>
        </Animated.View>

        {/* O2 paso 2 · qué vas a ver y qué va a ver la otra persona. */}
        <Stack gap="3">
          {[
            'Vas a ver los gastos del espacio, quién pagó y cómo están las cuentas.',
            'La otra persona va a ver lo que vos cargues ahí.',
            'Nada más: ni tu plata ni la suya son parte del espacio.',
          ].map((line, index) => (
            <Animated.View
              key={line}
              entering={FadeInDown.delay(stagger(index + 1, 70)).duration(duration.base)}
            >
              <Card tone="sunken">
                <Text variant="small">{line}</Text>
              </Card>
            </Animated.View>
          ))}
        </Stack>

        {/* §26 · el nombre visible se puede confirmar o cambiar al aceptar.
            Sin email es obligatorio: si no, el perfil no tiene de dónde sacarlo. */}
        <Stack gap="2">
          <Text variant="smallMedium" tone="secondary">
            ¿Cómo querés que te vean?
          </Text>
          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.space['4'],
              height: 50,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={60}
              accessibilityLabel="Tu nombre visible"
              style={[theme.typography.body, { color: theme.colors.text }]}
            />
          </View>
          {/* K7 · es lo único que ve el otro miembro. */}
          <Text variant="caption" tone="muted">
            Es lo único que va a ver la otra persona.
          </Text>
        </Stack>

        <Stack gap="3">
          {entryError != null && (
            <Text variant="small" tone="excess">
              {entryError}
            </Text>
          )}

          <Button
            label="Ahora no"
            variant="ghost"
            fullWidth
            haptic="none"
            onPress={() => router.replace(session == null ? '/(auth)/bienvenida' : '/')}
          />
        </Stack>
      </Stack>
    </Screen>
  );
}
