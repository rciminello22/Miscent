import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { addMonths, monthOf, type IsoDate, type Month } from '@domain/calendar';
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
import { buildMonthCalendar } from './calendarGrid';
import {
  canAddInMonth,
  canGoToNextMonth,
  effectiveFilter,
  filterSegments,
  groupRowsByDay,
  isFabHidden,
  monthHeadline,
  rowDestination,
} from './movementsView';

/**
 * El container de Movimientos: lee los hechos, elige el mes y el filtro y le
 * entrega a la pantalla todo ya calculado por las funciones puras de
 * `movementsView`.
 *
 * El mes, el filtro y el día pueden venir de afuera (las puertas y el mini
 * calendario los pasan por la ruta de la lista). El día vive SOLO en la lista:
 * la pestaña nunca queda filtrada.
 */
export function useMovementsMonth(initial?: {
  month?: Month;
  filter?: MovementFilter;
  day?: IsoDate | null;
}) {
  const { facts, today, isLoading, refetch } = usePersonalFacts();

  const [month, setMonth] = useState<Month>(initial?.month ?? monthOf(today));
  const [filterChoice, setFilter] = useState<MovementFilter>(initial?.filter ?? 'all');
  const [day, setDay] = useState<IsoDate | null>(initial?.day ?? null);
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
  const visible = useMemo(() => filterMovements(rows, filter, day), [rows, filter, day]);
  const groups = useMemo(() => groupRowsByDay(visible, today), [visible, today]);
  const calendar = useMemo(() => buildMonthCalendar({ month, today, rows }), [month, today, rows]);
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
    day,
    clearDay: () => setDay(null),
    visible,
    groups,
    calendar,
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
    // §16 · tocar abre el detalle, con Editar y Eliminar. Qué abre cada fila lo
    // decide `rowDestination` (SA-02: de un espacio del que saliste, nada).
    // Abrir el detalle NO cuenta como revisado (K10).
    const destination = rowDestination(row);
    if (destination == null) return;
    if (destination.kind === 'space') openSpace(destination.spaceId);
    else router.push(destination.href as Href);
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
