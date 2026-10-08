import { useState } from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Card, EmptyState, Pressable, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useSession } from '@/features/auth/SessionProvider';

/**
 * §33 U1 · Pantalla principal del invitado.
 *
 * "Objetivo: que entienda en segundos que está en un espacio compartido y que
 *  sus finanzas personales son otra cosa."
 *
 * La tarjeta "Tu plata personal" es fija y discreta, y hay una regla que no se
 * negocia: **nunca insiste**. Si toca "Ahora no", se reduce a una línea y no
 * vuelve a aparecer como tarjeta. El invitado no es un usuario a medias al que
 * hay que convertir; es una forma completa y válida de usar la app (§10).
 *
 * Nunca: pestañas bloqueadas, candados, "cuenta incompleta", "desbloqueá".
 */
export default function Espacios() {
  const router = useRouter();
  const { profile } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const nombre = profile?.displayName ?? 'vos';

  return (
    <Screen>
      <Stack gap="7">
        <Text variant="overline" tone="muted">
          Tus espacios
        </Text>

        {/* ⚠️ Fase 3 · los espacios del invitado y su saldo llegan en la Fase 6. */}
        <EmptyState
          title="No estás en ningún espacio."
          description="Cuando alguien te invite, lo vas a ver acá con las cuentas ya hechas."
        />

        {/* §33 U1 · "Tu plata personal" */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          {dismissed ? (
            <Pressable onPress={() => router.push('/onboarding/cuenta-personal')} haptic="none">
              <Text variant="small" tone="brand">
                Crear mi cuenta personal
              </Text>
            </Pressable>
          ) : (
            <Card tone="sunken">
              <Stack gap="4">
                <Stack gap="2">
                  <Text variant="bodyMedium">Tu plata personal</Text>
                  <Text variant="small" tone="secondary">
                    Lo que compartís con alguien es una cosa. Tus ingresos y tus gastos
                    propios son otra: si querés, podés ordenarlos acá, en privado.
                  </Text>
                </Stack>

                <Stack gap="2">
                  <Button
                    label="Crear mi cuenta personal"
                    fullWidth
                    onPress={() => router.push('/onboarding/cuenta-personal')}
                  />
                  <Pressable onPress={() => setDismissed(true)} haptic="none">
                    <Text variant="small" tone="muted" align="center">
                      Ahora no
                    </Text>
                  </Pressable>
                </Stack>
              </Stack>
            </Card>
          )}
        </Animated.View>

        <Text variant="caption" tone="muted">
          Hola, {nombre}. Fase 3 · el espacio compartido, quién puso más y los gastos
          llegan en la Fase 6.
        </Text>
      </Stack>
    </Screen>
  );
}
