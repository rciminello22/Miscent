import { useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addMonths, monthOf } from '@domain/calendar';
import { calculateFuture } from '@domain/future';
import { formatMonth } from '@/lib/format';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import {
  AudienceBadge,
  Card,
  EmptyState,
  Money,
  MonthBar,
  Row,
  Screen,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';

/**
 * §23 · Futuro. "Futuro es el corazón del producto."
 *
 * Responde: si sigo con lo que ya tengo registrado, ¿cómo vienen mis próximos
 * meses y qué tengo que pagar? No necesita saber cuánta plata va a tener el
 * usuario, y no lo pretende.
 *
 * Los seis meses, el ingreso previsto, Sin asignar y la línea de cuotas que
 * terminan salen de `calculateFuture` sobre los hechos del usuario. Ninguna
 * cifra se calcula en esta pantalla.
 *
 * §23.3 "Tus cuotas y tus fijos" llega en la Fase 5.
 */
export default function Futuro() {
  const { expansion, today, isLoading } = usePersonalFacts();
  const from = addMonths(monthOf(today), 1);

  const future = useMemo(() => calculateFuture(expansion, from, 6), [expansion, from]);
  const maxCommitted = Math.max(...future.months.map((month) => month.committed), 1);
  const hasCommitments = future.months.some((month) => month.committed > 0);

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            Futuro
          </Text>
          <AudienceBadge audience={{ kind: 'private' }} />
        </Row>

        {!hasCommitments ? (
          <EmptyState
            title="No tenés nada comprometido todavía."
            description="Cargá tus fijos y cuotas."
          />
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
              <Stack gap="4">
                <Text variant="title">Tus próximos 6 meses</Text>

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

                <Text variant="caption" tone="muted">
                  Tu parte de fijos, cuotas y tarjetas que se pagan cada mes.
                </Text>
              </Stack>
            </Animated.View>

            {/* §23.1 · "En marzo terminan 2 cuotas: tu comprometido baja $X por mes." */}
            {future.endingInstallments.map((ending) => (
              <Animated.View key={ending.month} entering={FadeInDown.duration(duration.base)}>
                <Card tone="brand">
                  <Text variant="small">
                    En {formatMonth(ending.month, from)} termina
                    {ending.count === 1 ? '' : 'n'} {ending.count} cuota
                    {ending.count === 1 ? '' : 's'}: tu comprometido baja{' '}
                    <Money amount={ending.monthlyDrop} variant="smallMedium" /> por mes.
                  </Text>
                </Card>
              </Animated.View>
            ))}

            {/* El detalle del primer mes: ingreso previsto y sin asignar. */}
            {future.months[0] != null && (
              <Stack gap="4">
                <SectionHeader title={formatMonth(future.months[0].month, from)} />
                <Card>
                  <Stack gap="3">
                    <DetailRow label="Comprometido" amount={future.months[0].committed} />
                    <DetailRow label="Ingreso previsto" amount={future.months[0].expectedIncome} />
                    {future.months[0].unassigned != null ? (
                      <DetailRow label="Sin asignar" amount={future.months[0].unassigned} />
                    ) : (
                      <Text variant="small" tone="secondary">
                        Sin ingreso registrado
                      </Text>
                    )}
                  </Stack>
                </Card>
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Screen>
  );
}

function DetailRow({ label, amount }: { label: string; amount: number }) {
  return (
    <Row justify="space-between" align="baseline">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Money amount={amount} variant="bodyMedium" />
    </Row>
  );
}
