import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SpaceOccurrence } from '@domain/occurrences';
import type { MemberPayment } from '@domain/types';
import { prettyLabel } from '@/features/add/categories';
import { goBack } from '@/features/shared/navigation';
import { Button, Divider, EmptyState, Row, SectionHeader, Stack } from '@/ui/primitives';
import { MovementItem } from './MovementItem';
import { PaidByMeSection } from './PaidByMeSection';
import { SpaceDetailShell } from './SpaceDetailShell';
import { SpacePaymentSheet } from './SpacePaymentSheet';
import { DeletedRow } from './SpaceRows';
import { StoppedFixedCard } from './StoppedFixedCard';
import { paidByOtherTitle } from './paidByMeCopy';
import { deletedLabel, deletedTag, markAllLabel, toReviewLine } from './reviewCopy';
import { buildSpaceMovements, taggedOccurrenceIds } from './spaceMovements';
import { useSpaceReview, useStoppedFixedResolution } from './useSpaceActions';
import { useSpacePendings } from './useSpacePendings';
import { useSpace } from './useSpaces';

/**
 * Lo pendiente del espacio (N3): lo que espera a quien mira, junto en una
 * pantalla.
 *
 *   1. SA-04 · el fijo que detuvo una salida: "¿Lo seguís pagando vos?". Va
 *      primero porque explica por qué cambió el radar y pide una decisión.
 *   2. Lo que el otro cargó como pagado por vos, sin medio.
 *   3. K10 · lo que cargó, editó o eliminó el otro y no revisaste. Revisar no es
 *      aprobar: ya cuenta, igual para los dos.
 */
export function SpacePendingScreen({ spaceId, inTabs }: { spaceId: string; inTabs: boolean }) {
  const router = useRouter();
  const { derived, today, isLoading, isError, refetch } = useSpace(spaceId);
  const pendings = useSpacePendings(spaceId, derived, today);
  const { reviewIds, reviewAll, isReviewing } = useSpaceReview(spaceId, derived);
  const { resolve, resolving } = useStoppedFixedResolution(spaceId, today, pendings.stopped);
  const [selectedPayment, setSelectedPayment] = useState<MemberPayment | null>(null);

  // Lo que hay que revisar, como las mismas filas de Movimientos.
  const toReview = useMemo(() => {
    if (derived == null) return [];
    const movements = buildSpaceMovements({
      occurrences: derived.occurrences,
      payments: derived.facts.payments,
      today,
    });
    const tagged = taggedOccurrenceIds(movements, derived.pendingReview);
    return movements
      .filter((movement) =>
        movement.kind === 'occurrence'
          ? tagged.has(movement.occurrence.id)
          : derived.pendingReview.has(movement.payment.id),
      )
      .map((movement) => ({ movement, tagged: true }));
  }, [derived, today]);

  function openOccurrence(occurrence: SpaceOccurrence) {
    router.push(
      occurrence.sourceKind === 'expense'
        ? `/space/${spaceId}/gasto/${occurrence.sourceId}`
        : `/space/${spaceId}/fijo/${occurrence.sourceId}`,
    );
  }

  const reviewCount = pendings.counts.toReview;
  const nothing = pendings.total === 0;

  return (
    <SpaceDetailShell
      title="Pendientes"
      otherName={derived?.other.displayName ?? null}
      inTabs={inTabs}
      loading={isLoading}
      error={isError || (!isLoading && derived == null)}
      onBack={() => goBack(router)}
      onRetry={refetch}
    >
      {derived != null && (
        <Stack gap="7">
          {/* SA-04 · §27 · "¿Lo seguís pagando vos?": explica por qué cambió el radar. */}
          {pendings.stopped.length > 0 && (
            <StoppedFixedCard
              otherName={pendings.stopped[0]!.otherName}
              spaceName={derived.facts.space.name}
              items={pendings.stopped.map((item) => ({
                recurrenceId: item.recurrenceId,
                label: item.description ?? prettyLabel(item.category),
                amount: item.amount,
              }))}
              canKeep={pendings.accountState === 'personal'}
              busyId={resolving}
              onKeep={(recurrenceId) => resolve(recurrenceId, true)}
              onEnd={(recurrenceId) => resolve(recurrenceId, false)}
            />
          )}

          {/* §5 1º Should · lo que el otro cargó como pagado por vos, sin medio:
              hasta que se completa, no entra al resumen de tu tarjeta. */}
          {pendings.accountState === 'personal' && pendings.myMembership != null && (
            <PaidByMeSection
              membership={pendings.myMembership}
              methods={pendings.personalFacts.paymentMethods}
              today={today}
              includeOwn={false}
              title={(count) => paidByOtherTitle(derived.other.displayName, count)}
            />
          )}

          {/* Opción B · K10 · lo que cargó, editó o eliminó el otro. */}
          {reviewCount > 0 && (
            <Stack gap="2">
              <Row justify="space-between" align="center" gap="3">
                <SectionHeader title={toReviewLine(reviewCount)} />
                <Button
                  label={markAllLabel(reviewCount)}
                  variant="ghost"
                  loading={isReviewing}
                  onPress={() => reviewAll()}
                />
              </Row>

              <Stack gap="0">
                {derived.pendingDeletions.map((item) => (
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
                    <Divider />
                  </View>
                ))}
                {toReview.map(({ movement, tagged }, index) => (
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
                      tagged={tagged}
                      onOpenOccurrence={openOccurrence}
                      onOpenPayment={setSelectedPayment}
                    />
                    {index < toReview.length - 1 && <Divider />}
                  </View>
                ))}
              </Stack>
            </Stack>
          )}

          {nothing && (
            <EmptyState
              title="No queda nada pendiente."
              description="Cuando algo necesite tu atención, aparece acá."
            />
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
