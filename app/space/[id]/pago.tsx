import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { ArrowRight, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { calculateSharedBalance } from '@domain/shared-balance';
import type { Slot } from '@domain/types';
import { formatPesos } from '@/lib/format';
import { AmountInput } from '@/features/add/AmountInput';
import { Field, Segmented } from '@/features/add/fields';
import { PastDateField } from '@/features/add/DateField';
import { balanceSentence } from '@/features/spaces/balanceCopy';
import { useCreateMemberPayment, useSpace } from '@/features/spaces/useSpaces';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import {
  Button,
  Card,
  IconButton,
  Money,
  Row,
  Screen,
  Stack,
  Text,
  TextLink,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §25 · §33 U6 · registrar un pago entre miembros.
 *
 * Lo más importante de esta pantalla es lo que el pago NO hace, y por eso está
 * escrito en la propia interfaz:
 *
 *   P-04 · "Solo modifica el saldo compartido. No cambia 'puso', Gastado,
 *           Comprometido ni Ingresos registrados de nadie."
 *
 * La razón es K9: la parte de cada uno ya estaba contada cuando se cargó el
 * gasto. Si el pago volviera a sumar, se contaría dos veces. De ahí la nota de
 * §33 U6: "No cambia lo que cada uno puso ni tu radar."
 *
 * G-06 · es una DECLARACIÓN. La app no verifica la transferencia, y no dice
 * que lo hizo.
 *
 * P-03 · se propone el monto y la dirección que dejan el saldo en cero, y se
 * aceptan parciales y mayores (con aviso).
 */
export default function Pago() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const spaceId = id ?? '';

  const { derived, today } = useSpace(spaceId);
  const createPayment = useCreateMemberPayment(spaceId);
  const feedback = useFeedback();

  const [amount, setAmount] = useState(0);
  const [direction, setDirection] = useState<'theyPay' | 'iPay'>('theyPay');
  // §25 · "→ fecha → Guardar". Hoy por defecto; nunca una fecha futura.
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // P-03 · la app propone lo que deja el saldo en cero.
  useEffect(() => {
    if (initialized || derived?.settlement == null) return;
    setAmount(derived.settlement.amount);
    setDirection(derived.settlement.fromSlot === derived.mySlot ? 'iPay' : 'theyPay');
    setInitialized(true);
  }, [derived, initialized]);

  const result = useMemo(() => {
    if (derived == null || amount === 0) return null;

    const { mySlot, other, facts } = derived;
    const fromSlot: Slot = direction === 'iPay' ? mySlot : other.slot;
    const toSlot: Slot = direction === 'iPay' ? other.slot : mySlot;

    // El saldo que va a quedar, calculado con el dominio sobre los hechos más
    // este pago: la interfaz no hace la cuenta por su cuenta.
    const after = calculateSharedBalance(
      {
        ...facts,
        payments: [
          ...facts.payments,
          {
            id: 'preview',
            spaceId,
            fromSlot,
            toSlot,
            amount,
            date,
            recordedBySlot: mySlot,
            // Una vista previa: no se guarda ni cuenta para la actividad.
            createdAt: `${date}T00:00:00+00:00`,
          },
        ],
      },
      mySlot,
      today,
    );

    return { fromSlot, toSlot, after };
  }, [derived, amount, direction, date, spaceId, today]);

  if (derived == null) {
    return (
      <Screen>
        <Text variant="body" tone="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const { other, me, balance, settlement, mySlot } = derived;
  const proposed = settlement?.amount ?? 0;

  // P-03 · un pago mayor al saldo lo invierte, y se avisa.
  const overpays = result != null && Math.sign(result.after.amount) === -Math.sign(balance.amount);

  async function save() {
    if (amount <= 0 || result == null) return;
    setSaving(true);

    try {
      const id = await createPayment.mutateAsync({
        spaceId,
        fromSlot: result.fromSlot,
        toSlot: result.toSlot,
        amount,
        date,
        mySlot,
      });
      feedback.saved({
        audience: spaceAudience(derived!.facts.space.name, other),
        // §25 · lo que importa de un pago es cómo queda el saldo.
        detail: `${balanceSentence(result.after)}.`,
        undo: { kind: 'payment', id, spaceId },
      });
      goBack(router);
    } catch (cause) {
      setSaving(false);
      feedback.error('No pudimos registrarlo', cause);
    }
  }

  return (
    <Screen
      footer={
        // Fijo abajo y sobre el teclado: se ve mientras se escribe (10/10).
        <Button
          label="Guardar"
          variant="shared"
          size="lg"
          fullWidth
          haptic="success"
          disabled={amount <= 0 || saving}
          loading={saving}
          onPress={() => void save()}
        />
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Registrar pago</Text>
          <IconButton
            label="Cerrar"
            onPress={() => goBack(router)}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <Card tone="shared">
          <Text variant="smallMedium">{balanceSentence(balance)}</Text>
        </Card>

        {/* §33 U6 · "¿Quién le pagó a quién?" */}
        <Field label="¿Quién le pagó a quién?">
          <Segmented
            options={[
              { value: 'theyPay', label: `${other.displayName} me pagó` },
              { value: 'iPay', label: `Le pagué a ${other.displayName}` },
            ]}
            value={direction}
            onChange={setDirection}
          />
        </Field>

        <Field label="¿Cuánto?">
          <AmountInput value={amount} onChange={setAmount} autoFocus={false} />
        </Field>

        {proposed > 0 && amount !== proposed && (
          <TextLink
            label={`Usar ${formatPesos(proposed)}, que deja todo a mano`}
            onPress={() => setAmount(proposed)}
          />
        )}

        <Field label="¿Cuándo?">
          <PastDateField value={date} onChange={setDate} today={today} />
        </Field>

        {/* El efecto, con el saldo que va a quedar. */}
        {result != null && (
          <Animated.View entering={FadeIn.duration(duration.quick)}>
            <Card>
              <Stack gap="4">
                <Row gap="3" align="center" justify="center">
                  <Text variant="smallMedium">
                    {result.fromSlot === derived.mySlot ? me.displayName : other.displayName}
                  </Text>
                  <ArrowRight size={16} color={theme.colors.textMuted} />
                  <Text variant="smallMedium">
                    {result.toSlot === derived.mySlot ? me.displayName : other.displayName}
                  </Text>
                  <Money amount={amount} variant="bodyMedium" />
                </Row>

                <View
                  style={{
                    paddingTop: theme.space['3'],
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <Text variant="small" tone="secondary" align="center">
                    {result.after.settled
                      ? 'Van a quedar a mano.'
                      : balanceSentence(result.after)}
                  </Text>
                </View>

                {overpays && (
                  <Text variant="caption" tone="secondary" align="center">
                    El pago es mayor que lo que se deben, así que el saldo se da vuelta.
                  </Text>
                )}
              </Stack>
            </Card>
          </Animated.View>
        )}

        {/*
          P-04 · la nota que evita el malentendido más común: el pago no
          vuelve a contar lo que ya estaba contado cuando se cargó el gasto.
          G-06 · y es una declaración, no una transferencia verificada.
        */}
        <Text variant="caption" tone="muted" align="center">
          No cambia lo que cada uno puso ni tu radar. Queda anotado que ustedes lo
          declararon; la app no verifica la transferencia.
        </Text>
      </Stack>
    </Screen>
  );
}
