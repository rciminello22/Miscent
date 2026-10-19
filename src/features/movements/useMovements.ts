import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { addMonths, monthOf, type Month } from '@domain/calendar';
import { formatMonth, formatPesos } from '@/lib/format';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
import { useFeedback } from '@/features/shared/useFeedback';
import { useDeleteMovement, usePersonalFacts } from '@/features/shared/usePersonalFacts';
import {
  buildMovementList,
  filterMovements,
  spacesInMonth,
  type MovementFilter,
  type MovementRow,
} from './buildMovementList';
import {
  buildDayStrip,
  canAddInMonth,
  canGoToNextMonth,
  effectiveFilter,
  filterSegments,
  groupRowsByDay,
  isFabHidden,
  monthHeadline,
} from './movementsView';

/**
 * El container de Movimientos: lee los hechos, elige el mes y el filtro y le
 * entrega a la pantalla todo ya calculado por las funciones puras de
 * `movementsView`.
 *
 * El mes y el filtro pueden venir de afuera (las puertas los pasan por la ruta
 * de la lista).
 */
export function useMovementsMonth(initial?: { month?: Month; filter?: MovementFilter }) {
  const { facts, today, isLoading, refetch } = usePersonalFacts();

  const [month, setMonth] = useState<Month>(initial?.month ?? monthOf(today));
  const [filterChoice, setFilter] = useState<MovementFilter>(initial?.filter ?? 'all');
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(
    () =>
      buildMovementList({
        facts,
        month,
        monthName: (value) => formatMonth(value, month),
        formatAmount: formatPesos,
      }),
    [facts, month],
  );

  const spaces = useMemo(() => spacesInMonth(facts, month), [facts, month]);
  const filter = effectiveFilter(filterChoice, spaces);
  const visible = useMemo(() => filterMovements(rows, filter), [rows, filter]);
  const groups = useMemo(() => groupRowsByDay(visible, today), [visible, today]);
  const strip = useMemo(() => buildDayStrip({ month, today, rows }), [month, today, rows]);
  const segments = useMemo(() => filterSegments(spaces), [spaces]);

  async function refresh() {
    setRefreshing(true);
    // SY-01 · deslizar para ver los cambios del otro miembro.
    await refetch();
    setRefreshing(false);
  }

  return {
    today,
    isLoading,
    refreshing,
    refresh,
    month,
    monthLabel: capitalize(formatMonth(month, monthOf(today))),
    goToPrevious: () => setMonth(addMonths(month, -1)),
    goToNext: canGoToNextMonth(month, today) ? () => setMonth(addMonths(month, 1)) : null,
    canAdd: canAddInMonth(month, today),
    fabHidden: isFabHidden({ month, today, count: rows.length }),
    headline: monthHeadline({ count: rows.length, month, today }),
    count: rows.length,
    rows,
    spaces,
    segments,
    filter,
    setFilter,
    visible,
    groups,
    strip,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Tocar una fila abre su detalle; mantener presionado un movimiento propio lo elimina. */
export function useMovementActions() {
  const router = useRouter();
  const openSpace = useOpenSpace();
  const deleteMovement = useDeleteMovement();
  const feedback = useFeedback();

  function open(row: MovementRow) {
    // §16 · tocar abre el detalle, con Editar y Eliminar.
    // SA-02 · de un espacio del que saliste ya no hay detalle.
    if (row.formerSpace) return;
    if (row.spaceId != null) {
      openSpace(row.spaceId);
      return;
    }
    router.push(`/movimiento/${row.id.replace('movement:', '')}`);
  }

  function confirmDelete(row: MovementRow) {
    if (!row.deletable) return;

    // X-01 · eliminar un hecho recalcula todo lo que depende de él.
    Alert.alert('¿Eliminar este movimiento?', 'Tu radar y tu Futuro se recalculan sin él.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteMovement
            .mutateAsync(row.id.replace('movement:', ''))
            .then(() => feedback.deleted({ kind: 'private' }))
            .catch((cause: unknown) => feedback.error('No pudimos eliminarlo', cause));
        },
      },
    ]);
  }

  return { open, confirmDelete };
}
