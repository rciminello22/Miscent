import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addMonths } from '@domain/calendar';
import { calculateFuture, previewInstallments } from '@domain/future';
import { installmentAmounts } from '@domain/installments';
import type { InstallmentPlan } from '@domain/types';
import type { PersonalExpansion } from '@domain/occurrences';
import type { Pesos } from '@domain/money';
import { formatMonth } from '@/lib/format';
import { Card, Money, Row, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §17 campo 12 · la vista previa de una compra en cuotas.
 *
 * M4 la marca como parte del Must, y §3 la pone entre las preguntas que el
 * producto responde: "¿Cómo cambian mis próximos meses si compro esto en 6
 * cuotas?". Es la función que más claramente reemplaza una planilla, porque
 * en Excel esa respuesta exige construir seis columnas a mano.
 *
 * Y tiene una prohibición explícita (§17, §33): **nunca dice "te alcanza" ni
 * "no te alcanza"**. Eso sería una afirmación sobre dinero real. Muestra cómo
 * cambian Comprometido y Sin asignar, y el usuario decide.
 *
 * La animación en cascada no es adorno: hace que la vista recorra los meses en
 * orden, que es cómo se entiende el efecto de una compra en cuotas.
 */
export function InstallmentPreview({
  expansion,
  total,
  plan,
  /** K9 · si el gasto es compartido, solo la parte del usuario. */
  myShareRatio = 1,
  today,
}: {
  expansion: PersonalExpansion;
  total: Pesos;
  plan: InstallmentPlan;
  myShareRatio?: number;
  today: string;
}) {
  const theme = useTheme();

  const preview = useMemo(() => {
    const from = addMonths(today.slice(0, 7), 1);
    const before = calculateFuture(expansion, from, 6);
    const firstInstallment = installmentAmounts(total, plan.count)[0] ?? 0;

    return previewInstallments({
      before,
      myShare: Math.round(firstInstallment * myShareRatio),
      firstMonth: plan.firstMonth,
      count: plan.count,
    });
  }, [expansion, total, plan, myShareRatio, today]);

  const lastMonth = addMonths(plan.firstMonth, plan.count - 1);
  const changed = preview.months.filter((month) => month.committedAfter !== month.committedBefore);

  if (changed.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(duration.base)}>
      <Card tone="brand">
        <Stack gap="4">
          <Text variant="smallMedium">
            Suma <Money amount={preview.perMonth} variant="smallMedium" /> por mes durante{' '}
            {plan.count} {plan.count === 1 ? 'mes' : 'meses'}
            {myShareRatio < 1 ? ' (tu parte)' : ''}.
          </Text>

          <Stack gap="3">
            {changed.slice(0, 3).map((month, index) => (
              <Animated.View
                key={month.month}
                entering={FadeInDown.delay(stagger(index, 70)).duration(duration.base)}
              >
                <Stack gap="1">
                  <Text variant="caption" tone="muted">
                    {formatMonth(month.month, plan.firstMonth)}
                  </Text>

                  <ChangeRow
                    label="Comprometido"
                    before={month.committedBefore}
                    after={month.committedAfter}
                  />

                  {month.unassignedBefore != null && month.unassignedAfter != null ? (
                    <ChangeRow
                      label="Sin asignar"
                      before={month.unassignedBefore}
                      after={month.unassignedAfter}
                    />
                  ) : (
                    <Text variant="caption" tone="muted">
                      Sin ingreso registrado para ese mes
                    </Text>
                  )}
                </Stack>
              </Animated.View>
            ))}
          </Stack>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingTop: theme.space['3'],
            }}
          >
            <Text variant="caption" tone="secondary">
              Las cuotas van de {formatMonth(plan.firstMonth, plan.firstMonth)} a{' '}
              {formatMonth(lastMonth, plan.firstMonth)}
              {plan.approximate ? ' · fechas aproximadas' : ''}.
            </Text>
          </View>
        </Stack>
      </Card>
    </Animated.View>
  );
}

function ChangeRow({
  label,
  before,
  after,
}: {
  label: string;
  before: Pesos;
  after: Pesos;
}) {
  return (
    <Row gap="2" align="baseline">
      <Text variant="small" tone="secondary" style={{ flex: 1 }}>
        {label}
      </Text>
      <Money amount={before} variant="small" tone="muted" />
      <Text variant="small" tone="muted">
        →
      </Text>
      <Money amount={after} variant="smallMedium" />
    </Row>
  );
}
