import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SpaceOccurrence } from '@domain/occurrences';
import type { MemberPayment } from '@domain/types';
import { prettyLabel } from '@/features/add/categories';
import { goBack } from '@/features/shared/navigation';
import { Divider, EmptyState, SectionHeader, Stack, Text } from '@/ui/primitives';
import { MovementItem } from './MovementItem';
import { DeletedRow } from './SpaceRows';
import { SpaceDetailShell } from './SpaceDetailShell';
import { SpacePaymentSheet } from './SpacePaymentSheet';
import { deletedLabel, deletedTag } from './reviewCopy';
import {
  buildSpaceMovements,
  dayHeading,
  groupMovementsByDay,
  taggedOccurrenceIds,
} from './spaceMovements';
import { useSpaceReview } from './useSpaceActions';
import { useSpace } from './useSpaces';

/**
 * Los movimientos del espacio (N3): todos, gastos y pagos entre ustedes,
 * agrupados por día. Cada fila dice quién la cargó o editó (K3) y lleva la
 * marca de "para revisar" cuando es del otro y no la viste (K10).
 *
 * La lista scrollea acá, en su pantalla: ya no hay "Ver todos".
 */
export function SpaceMovementsScreen({ spaceId, inTabs }: { spaceId: string; inTabs: boolean }) {
  const router = useRouter();
  const { derived, today, isLoading, isError, refetch } = useSpace(spaceId);
  const [selectedPayment, setSelectedPayment] = useState<MemberPayment | null>(null);
  const { reviewIds } = useSpaceReview(spaceId, derived);

  const movements = useMemo(
    () =>
      derived == null
        ? []
        : buildSpaceMovements({
            occurrences: derived.occurrences,
            payments: derived.facts.payments,
            today,
          }),
    [derived, today],
  );
  const tagged = useMemo(
    () => (derived == null ? new Set<string>() : taggedOccurrenceIds(movements, derived.pendingReview)),
    [derived, movements],
  );
  const days = useMemo(() => groupMovementsByDay(movements), [movements]);

  function openOccurrence(occurrence: SpaceOccurrence) {
    // Un gasto se edita desde su detalle; un fijo, desde el fijo (§21: los dos
    // lo editan), no desde un mes suelto.
    router.push(
      occurrence.sourceKind === 'expense'
        ? `/space/${spaceId}/gasto/${occurrence.sourceId}`
        : `/space/${spaceId}/fijo/${occurrence.sourceId}`,
    );
  }

  const hasPayments = movements.some((movement) => movement.kind === 'payment');

  return (
    <SpaceDetailShell
      title="Movimientos"
      otherName={derived?.other.displayName ?? null}
      inTabs={inTabs}
      loading={isLoading}
      error={isError || (!isLoading && derived == null)}
      onBack={() => goBack(router)}
      onRetry={refetch}
    >
      {derived != null && (
        <Stack gap="6">
          {/* Opción B · lo que eliminó el otro ya no está en la lista: queda
              su rastro hasta que lo revisás. */}
          {derived.pendingDeletions.length > 0 && (
            <Stack gap="0">
              {derived.pendingDeletions.map((item, index) => (
                <View key={`deleted-${item.sourceId}`}>
                  <DeletedRow
                    item={item}
                    label={deletedLabel(item, {
                      mySlot: derived.mySlot,
                      otherName: derived.other.displayName,
                      categoryLabel: prettyLabel,
                    })}
                    tag={deletedTag(derived.other.displayName)}
                    onReviewed={() => reviewIds([item.sourceId])}
                  />
                  {index < derived.pendingDeletions.length - 1 && <Divider />}
                </View>
              ))}
            </Stack>
          )}

          {movements.length === 0 ? (
            <EmptyState
              title="Anoten acá lo que pagan para la casa."
              description="La app hace las cuentas."
            />
          ) : (
            days.map((day) => (
              <Stack key={day.date} gap="0">
                <SectionHeader title={dayHeading(day.date, today)} />
                {day.movements.map((movement, index) => (
                  <View
                    key={
                      movement.kind === 'occurrence'
                        ? movement.occurrence.id
                        : `payment-${movement.payment.id}`
                    }
                  >
                    <MovementItem
                      movement={movement}
                      derived={derived}
                      tagged={movement.kind === 'occurrence' && tagged.has(movement.occurrence.id)}
                      onOpenOccurrence={openOccurrence}
                      onOpenPayment={setSelectedPayment}
                    />
                    {index < day.movements.length - 1 && <Divider />}
                  </View>
                ))}
              </Stack>
            ))
          )}

          {/* P-04 · una sola vez, no en cada pago. */}
          {hasPayments && (
            <Text variant="caption" tone="muted">
              Los pagos entre ustedes cambian lo que se deben, no lo que cada uno puso.
            </Text>
          )}

          <SpacePaymentSheet
            spaceId={spaceId}
            derived={derived}
            today={today}
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
          />
        </Stack>
      )}
    </SpaceDetailShell>
  );
}
