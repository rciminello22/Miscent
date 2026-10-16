import { useState } from 'react';
import { addMonths, monthOf } from '@domain/calendar';
import { formatMonth, formatPesos } from '@/lib/format';
import { useFeedback } from '@/features/shared/useFeedback';
import { useMarkReviewed, useResolveStoppedRecurrence, type useSpace } from './useSpaces';
import type { useSpacePendings } from './useSpacePendings';

type Derived = NonNullable<ReturnType<typeof useSpace>['derived']>;
type Stopped = ReturnType<typeof useSpacePendings>['stopped'];

/**
 * Opción B · "Está bien" sobre uno o varios registros del otro. Lo usan las
 * pantallas de Movimientos y de Pendientes: revisar no es aprobar, ya cuenta,
 * igual para los dos.
 */
export function useSpaceReview(spaceId: string, derived: Derived | null) {
  const markReviewed = useMarkReviewed(spaceId);
  const feedback = useFeedback();

  function reviewIds(sourceIds: readonly string[], detail = 'Listo, ya lo revisaste.') {
    markReviewed
      .mutateAsync(sourceIds)
      .then(() => feedback.updated(detail))
      .catch((cause: unknown) => feedback.error('No pudimos marcarlo', cause));
  }

  function reviewAll() {
    if (derived == null) return;
    reviewIds([
      ...derived.pendingReview.keys(),
      ...derived.pendingDeletions.map((item) => item.sourceId),
    ]);
  }

  return { reviewIds, reviewAll, isReviewing: markReviewed.isPending };
}

/**
 * SA-04 · §27 · la decisión sobre un fijo que detuvo una salida: seguir pagándolo
 * vos o dejar de contarlo. Explica en el aviso desde qué mes cambia el radar.
 */
export function useStoppedFixedResolution(
  spaceId: string,
  today: string,
  stopped: Stopped,
) {
  const resolveStopped = useResolveStoppedRecurrence(spaceId);
  const feedback = useFeedback();
  const [resolving, setResolving] = useState<string | null>(null);
  const currentMonth = monthOf(today);

  function resolve(recurrenceId: string, keep: boolean) {
    const item = stopped.find((candidate) => candidate.recurrenceId === recurrenceId);
    if (item == null) return;
    // Desde el mes siguiente al último en que fue compartido.
    const from = formatMonth(addMonths(item.endMonth, 1), currentMonth);

    setResolving(recurrenceId);
    resolveStopped
      .mutateAsync({ recurrenceId, keep })
      .then(() =>
        feedback.updated(
          keep
            ? `Ahora está en tus fijos: ${formatPesos(item.amount)} por mes desde ${from}.`
            : `Deja de contar desde ${from}.`,
        ),
      )
      .catch((cause: unknown) => feedback.error('No pudimos guardarlo', cause))
      .finally(() => setResolving(null));
  }

  return { resolve, resolving };
}
