import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addMonths, monthOf } from '@domain/calendar';
import { calculateFuture } from '@domain/future';
import { formatMonth } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { activatePersonalAccount } from '@/data/repositories/mutations';
import {
  Button,
  Card,
  Money,
  MonthBar,
  Row,
  Screen,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';

/**
 * O3 paso 6 · el resultado: "Futuro con los próximos meses y sus pagos".
 *
 * Texto de §13: "Esto es lo que ya tiene destino en tus próximos meses."
 *
 * Este momento es el aha moment que §3 declara como hipótesis del pilar
 * personal: "al terminar la activación, ver los próximos meses ya cargados con
 * cuotas y fijos". Si acá el usuario no dice "ah, mirá", el onboarding falló,
 * y eso es justo lo que §35 va a observar en el piloto.
 *
 * Las barras entran en cascada a propósito: hacen recorrer los meses en orden.
 */
export default function Listo() {
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const { expansion, today } = usePersonalFacts();

  const from = addMonths(monthOf(today), 1);
  const future = useMemo(() => calculateFuture(expansion, from, 6), [expansion, from]);
  const maxCommitted = Math.max(...future.months.map((month) => month.committed), 1);
  const firstMonth = future.months[0];

  async function finish() {
    // A-02 · la activación es explícita. Si el usuario llegó acá desde el
    // Estado B, recién ahora pasa a tener cuenta personal.
    if (profile?.hasPersonalAccount !== true) {
      await activatePersonalAccount();
      await refreshProfile();
    }
    router.replace('/(personal)/futuro');
  }

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="3">
            <Text variant="title">Tu cuenta personal está lista</Text>
            <Text variant="body" tone="secondary">
              Esto es lo que ya tiene destino en tus próximos meses.
            </Text>
          </Stack>
        </Animated.View>

        {firstMonth != null && firstMonth.committed > 0 ? (
          <>
            <Animated.View entering={FadeInDown.delay(stagger(1, 90)).duration(duration.base)}>
              <Card tone="brand">
                <Stack gap="2">
                  <Text variant="small" tone="secondary">
                    En {formatMonth(firstMonth.month, from)} ya tenés
                  </Text>
                  <Row gap="2" align="baseline">
                    <Money amount={firstMonth.committed} variant="title" animate />
                    <Text variant="small" tone="secondary">
                      comprometidos
                    </Text>
                  </Row>
                </Stack>
              </Card>
            </Animated.View>

            <Stack gap="3">
              {future.months.map((month, index) => (
                <MonthBar
                  key={month.month}
                  month={month.month}
                  committed={month.committed}
                  maxCommitted={maxCommitted}
                  index={index}
                  highlighted={index === 0}
                />
              ))}
            </Stack>
          </>
        ) : (
          <Card tone="sunken">
            <Text variant="small" tone="secondary">
              Todavía no cargaste fijos ni cuotas. En cuanto agregues el primero, acá vas
              a ver cómo vienen tus próximos meses.
            </Text>
          </Card>
        )}

        <Button
          label="Ver mi Futuro"
          size="lg"
          fullWidth
          haptic="success"
          onPress={() => void finish()}
        />
      </Stack>
    </Screen>
  );
}
