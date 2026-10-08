import { useState } from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/data/supabase';
import { useSession } from '@/features/auth/SessionProvider';
import { Button, Card, Pressable, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';

/**
 * §33 U2 · Activar cuenta personal · O3 paso 1.
 *
 * "Tu cuenta personal es solo tuya. Vas a anotar tus ingresos, gastos y cuotas
 *  para ver qué parte ya tiene destino y qué pagos se vienen. En Casa no
 *  cambia nada y Renzo no ve nada nuevo."
 *
 * A-04 · activar la cuenta NO cambia identidad, nombre, historial compartido
 * ni se le comunica al otro miembro. §11 · "no es una migración; es activar la
 * cuenta personal del mismo usuario".
 *
 * Este es el paso 1. Los pasos 2 a 6 siguen en ingreso → tarjetas → deuda →
 * fijos → listo, y cada uno guarda lo suyo al avanzar.
 */
export default function CuentaPersonal() {
  const router = useRouter();
  const { refreshProfile } = useSession();
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setActivating(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('app_activate_personal_account');

    if (rpcError != null) {
      setActivating(false);
      setError('No pudimos activarla. Probá de nuevo en un momento.');
      return;
    }

    await refreshProfile();
    setActivating(false);
    // O3 sigue con el ingreso (paso 2). El RouteGuard deja pasar /onboarding.
    router.push('/onboarding/ingreso');
  }

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="4">
            <Text variant="title">Tu cuenta personal es solo tuya</Text>
            <Text variant="body" tone="secondary">
              Vas a anotar tus ingresos, gastos y cuotas para ver qué parte ya tiene
              destino y qué pagos se vienen.
            </Text>
          </Stack>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(duration.base)}>
          <Card tone="sunken">
            <Text variant="small">
              En tus espacios compartidos no cambia nada, y la otra persona no va a ver
              nada nuevo.
            </Text>
          </Card>
        </Animated.View>

        <Stack gap="4">
          <Button
            label="Crear mi cuenta personal"
            size="lg"
            fullWidth
            loading={activating}
            haptic="success"
            onPress={() => void activate()}
          />

          {error != null && (
            <Text variant="small" tone="excess">
              {error}
            </Text>
          )}

          <Pressable onPress={() => router.back()} haptic="none">
            <Text variant="small" tone="muted" align="center">
              Ahora no
            </Text>
          </Pressable>
        </Stack>
      </Stack>
    </Screen>
  );
}
