import { useMemo } from 'react';
import { addMonths, monthOf } from '@domain/calendar';
import { activeInstallmentPlans } from '@domain/future';
import { formatInstallment, formatMonth } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { spaceContext } from '@/features/spaces/departureCopy';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { AudienceIcon, Card, Money, Row, Skeleton, Stack, Text } from '@/ui/primitives';
import { FutureDetailShell } from './FutureDetailShell';

/**
 * §23.3 · Tus cuotas, en su pantalla (N3): cada compra en cuotas activa, en qué
 * cuota va, cuándo termina y cuánto falta (tu parte).
 */
export function FutureInstallmentsScreen() {
  const { expansion, today, isLoading, refetch } = usePersonalFacts();
  const from = addMonths(monthOf(today), 1);
  const plans = useMemo(() => activeInstallmentPlans(expansion, today), [expansion, today]);

  return (
    <FutureDetailShell title="Tus cuotas" onRefresh={refetch}>
      {isLoading ? (
        <Skeleton height={72} />
      ) : plans.length === 0 ? (
        <Text variant="small" tone="secondary">
          No tenés compras en cuotas activas.
        </Text>
      ) : (
        <Stack gap="3">
          {plans.map((plan) => (
            <Card key={plan.purchaseId}>
              <Stack gap="2">
                <Row justify="space-between" align="baseline">
                  <Row gap="2" align="center" style={{ flexShrink: 1 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {prettyLabel(plan.label)}
                    </Text>
                    {plan.spaceName != null && (
                      <AudienceIcon audience={{ kind: 'shared', otherMemberName: '' }} size={12} />
                    )}
                  </Row>
                  <Text variant="smallMedium" tone="secondary" tabular>
                    {formatInstallment(plan.current, plan.count)}
                  </Text>
                </Row>

                <Row justify="space-between" align="baseline" gap="3">
                  <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                    {plan.spaceName != null
                      ? `${spaceContext(plan.spaceName, plan.fromFormerMembership)} · tu parte · `
                      : ''}
                    termina en {formatMonth(plan.endsOn, from)}
                  </Text>
                  {/* UX-24 · el número de la derecha dice qué es. */}
                  <Row gap="1" align="baseline">
                    <Text variant="caption" tone="muted">
                      faltan
                    </Text>
                    <Money amount={plan.remaining} variant="small" tone="secondary" />
                  </Row>
                </Row>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </FutureDetailShell>
  );
}
