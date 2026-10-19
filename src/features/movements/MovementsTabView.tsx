import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import type { IsoDate, Month } from '@domain/calendar';
import { Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { filterMovements, type MovementFilter, type MovementRow } from './buildMovementList';
import { buildMonthCalendar } from './calendarGrid';
import { DotHelp } from './DotHelp';
import { MonthSummary } from './MonthSummary';
import { MovementDayList } from './MovementRowView';
import { MovementFilters } from './MovementFilters';
import {
  emptyListMessage,
  initialSelection,
  listHeading,
  monthFigures,
  monthShape,
  reviewLine,
  scopeDay,
  selectDay,
  stepWeek,
  stripView,
  toggleWholeMonth,
  weekIndexOf,
} from './movementsTab';
import { groupRowsByDay, type FilterSegment } from './movementsView';
import { WeekStrip } from './WeekStrip';

/**
 * §16 · la pestaña Movimientos (16A), entera y sin navegar: el N1 (hoy y el
 * mes), los filtros, la franja de una semana y la lista del día elegido.
 *
 * Tiene el estado de la pantalla: qué día (o "Todo el mes") muestra la lista y
 * qué semana muestra la franja. El mes y el filtro vienen de afuera: el mes
 * reinicia este estado (quien lo usa le pone `key={month}`) y el filtro
 * sobrevive al cambio de mes.
 *
 * Las cifras del N1 y la forma del mes cuentan los registros del mes, siempre
 * los mismos: no cambian al elegir un día ni un filtro. La franja y la lista sí
 * siguen al filtro, así un punto nunca promete una lista vacía.
 *
 * Presentacional respecto de los datos: recibe las filas ya armadas.
 */
export function MovementsTabView({
  month,
  monthLabel,
  today,
  rows,
  segments,
  filter,
  initialDay,
  isLoading,
  onFilterChange,
  onPreviousMonth,
  onNextMonth,
  onOpenRow,
  onLongPressRow,
}: {
  month: Month;
  monthLabel: string;
  today: IsoDate;
  /** TODAS las filas del mes, sin filtrar. */
  rows: readonly MovementRow[];
  segments: readonly FilterSegment[];
  filter: MovementFilter;
  /** El día de la ruta (`?dia=`), si vino. */
  initialDay?: IsoDate | null;
  isLoading: boolean;
  onFilterChange: (next: MovementFilter) => void;
  onPreviousMonth: () => void;
  onNextMonth: (() => void) | null;
  onOpenRow: (row: MovementRow) => void;
  onLongPressRow?: (row: MovementRow) => void;
}) {
  const theme = useTheme();

  const monthCalendar = useMemo(() => buildMonthCalendar({ month, today, rows }), [month, today, rows]);
  const [selection, setSelection] = useState(() =>
    initialSelection({ month, today, day: initialDay }),
  );
  const [weekIndex, setWeekIndex] = useState(() => weekIndexOf(monthCalendar, selection.day));

  // El N1: siempre el mes entero, sin filtro.
  const figures = useMemo(() => monthFigures({ rows, month, today }), [rows, month, today]);
  const shape = useMemo(() => monthShape(monthCalendar), [monthCalendar]);
  const review = useMemo(() => reviewLine(rows), [rows]);

  // La franja y la lista siguen al filtro.
  const filtered = useMemo(() => filterMovements(rows, filter), [rows, filter]);
  const stripCalendar = useMemo(
    () => buildMonthCalendar({ month, today, rows: filtered }),
    [month, today, filtered],
  );
  const strip = stripView({ calendar: stripCalendar, weekIndex, month, today });

  const visible = useMemo(
    () => filterMovements(rows, filter, scopeDay(selection)),
    [rows, filter, selection],
  );
  const groups = useMemo(() => groupRowsByDay(visible, today), [visible, today]);
  const heading = listHeading({ selection, month, today, count: visible.length });

  function pickDay(date: IsoDate) {
    setSelection(selectDay(selection, date, { month, today }));
  }

  function toggleMonth() {
    const next = toggleWholeMonth(selection);
    // Al apagarlo se vuelve al día elegido: la franja va a su semana.
    if (!next.wholeMonth) setWeekIndex(weekIndexOf(stripCalendar, next.day));
    setSelection(next);
  }

  function step(delta: -1 | 1) {
    setWeekIndex(stepWeek(stripCalendar, weekIndex, delta, { month, today }));
  }

  return (
    <Stack gap="4">
      <MonthSummary
        monthLabel={monthLabel}
        figures={figures}
        shape={shape}
        review={review}
        onPrevious={onPreviousMonth}
        onNext={onNextMonth}
      />

      <MovementFilters segments={segments} value={filter} onChange={onFilterChange} />

      <Stack gap="2">
        <WeekStrip
          strip={strip}
          selectedDate={selection.wholeMonth ? null : selection.day}
          wholeMonth={selection.wholeMonth}
          onSelectDay={pickDay}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          onToggleMonth={toggleMonth}
        />
        <DotHelp recordDays={stripCalendar.recordDays} />
      </Stack>

      <Stack gap="3">
        <Text variant="bodyMedium" accessibilityRole="header">
          {heading.text}
        </Text>

        {isLoading ? (
          <Stack gap="4">
            <Skeleton height={56} />
            <Skeleton height={56} />
          </Stack>
        ) : visible.length === 0 ? (
          <View
            accessible
            role="status"
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space['2'],
              minHeight: 44,
            }}
          >
            <CalendarDays size={16} color={theme.colors.textMuted} />
            <Text variant="small" tone="secondary" style={{ flex: 1 }}>
              {emptyListMessage({ selection, month, today, anyInMonth: rows.length > 0 })}
            </Text>
          </View>
        ) : (
          <MovementDayList
            groups={groups}
            hideHeadings={!selection.wholeMonth}
            showSpace={filter === 'all' || filter === 'shared'}
            onOpen={onOpenRow}
            onLongPress={onLongPressRow}
          />
        )}
      </Stack>
    </Stack>
  );
}
