import {
  addDays,
  dateInMonth,
  lastDayOfMonth,
  monthOf,
  parseMonth,
  compareDates,
  type IsoDate,
  type Month,
} from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { formatDayMonth, formatMonth } from '@/lib/format';
import type { MovementFilter, MovementRow } from './buildMovementList';

/**
 * §16 · la lógica de Movimientos que comparten las dos variantes (la pestaña
 * como lista y la pestaña como resumen con puertas). TS puro: al descartar una
 * variante solo se borra su presentación; esto se queda.
 */

/* ── La lista, agrupada por día ───────────────────────────────────────────── */

export type DayGroup = { date: IsoDate; heading: string; rows: MovementRow[] };

/** Agrupa por día conservando el orden en que vienen (ya ordenadas por fecha). */
export function groupRowsByDay(rows: readonly MovementRow[], today: IsoDate): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of rows) {
    const last = groups[groups.length - 1];
    if (last != null && last.date === item.date) {
      last.rows.push(item);
      continue;
    }
    const short = formatDayMonth(item.date);
    groups.push({
      date: item.date,
      heading: item.date === today ? `Hoy · ${short}` : short,
      rows: [item],
    });
  }
  return groups;
}

/* ── La tira de días ──────────────────────────────────────────────────────── */

export type StripDay = {
  day: number;
  date: IsoDate;
  /** `with`: tiene registros. `today`: hoy (con o sin registros). `future`: todavía no llegó. */
  state: 'empty' | 'with' | 'today' | 'future';
  /** Cuántos registros: la tira cuenta registros, nunca montos ("cifras por día" está prohibido). */
  count: number;
};

export function buildDayStrip(args: {
  month: Month;
  today: IsoDate;
  rows: readonly MovementRow[];
}): StripDay[] {
  const { year, month: m } = parseMonth(args.month);
  const counts = new Map<IsoDate, number>();
  for (const item of args.rows) counts.set(item.date, (counts.get(item.date) ?? 0) + 1);

  return Array.from({ length: lastDayOfMonth(year, m) }, (_, index) => {
    const day = index + 1;
    const date = dateInMonth(args.month, day);
    const count = counts.get(date) ?? 0;

    let state: StripDay['state'] = count > 0 ? 'with' : 'empty';
    if (date === args.today) state = 'today';
    else if (compareDates(date, args.today) > 0) state = 'future';

    return { day, date, state, count };
  });
}

/** Para el lector de pantalla: la tira no se distingue solo por color. */
export function stripAccessibilityLabel(strip: readonly StripDay[]): string {
  const days = strip.filter((day) => day.count > 0).map((day) => day.day);
  return days.length === 0 ? 'Ningún día con registros' : `Días con registros: ${days.join(', ')}`;
}

/* ── El mes ───────────────────────────────────────────────────────────────── */

/** La frase del N1: "12 registros", o el vacío de §16 según el mes. */
export function monthHeadline(args: { count: number; month: Month; today: IsoDate }): string {
  if (args.count === 1) return '1 registro';
  if (args.count > 1) return `${args.count} registros`;

  const name = formatMonth(args.month, monthOf(args.today));
  return args.month === monthOf(args.today)
    ? `Todavía no registraste nada en ${name}.`
    : `No registraste nada en ${name}.`;
}

/** El futuro es de Futuro: no se navega a un mes que todavía no llegó. */
export function canGoToNextMonth(month: Month, today: IsoDate): boolean {
  return month < monthOf(today);
}

/** Un mes que ya pasó se ve completo, pero no se le agrega nada. */
export function canAddInMonth(month: Month, today: IsoDate): boolean {
  return month === monthOf(today);
}

/**
 * El botón flotante "Agregar" se esconde donde no corresponde o sobra: en un
 * mes que ya pasó, y en el mes en curso vacío, donde el N1 trae su propio
 * Agregar (para no tener dos).
 */
export function isFabHidden(args: { month: Month; today: IsoDate; count: number }): boolean {
  return !canAddInMonth(args.month, args.today) || args.count === 0;
}

/* ── El control segmentado ────────────────────────────────────────────────── */

export type FilterSegment = {
  key: MovementFilter;
  label: string;
  kind: 'all' | 'personal' | 'space';
};

type SpaceRef = { id: string; name: string };

/** §16 · "Todos · Personales · uno por espacio". Sin espacios no hay nada que filtrar. */
export function filterSegments(spaces: readonly SpaceRef[]): FilterSegment[] {
  if (spaces.length === 0) return [];
  return [
    { key: 'all', label: 'Todos', kind: 'all' },
    { key: 'personal', label: 'Personales', kind: 'personal' },
    ...spaces.map((space): FilterSegment => ({ key: space.id, label: space.name, kind: 'space' })),
  ];
}

/** Un filtro que ya no existe en este mes (el espacio no tiene nada) vuelve a Todos. */
export function effectiveFilter(filter: MovementFilter, spaces: readonly SpaceRef[]): MovementFilter {
  if (filter === 'all' || filter === 'personal' || filter === 'shared') return filter;
  return spaces.some((space) => space.id === filter) ? filter : 'all';
}

/* ── Una fila ─────────────────────────────────────────────────────────────── */

export type RowDetail = {
  caption: string | null;
  effect: { kind: 'installments' | 'card' | 'income'; text: string } | null;
};

/**
 * Lo que va bajo el título de la fila, solo si agrega algo: el espacio y quién
 * pagó, "no cambia tu radar" (P-04) y el efecto ("Se paga en noviembre", "6
 * cuotas de $30.000", "Ingreso registrado"). La fecha la da el encabezado del
 * día. `showSpace` es falso dentro de la lista de un espacio, donde el nombre
 * sobra (salvo uno del que ya saliste: eso se dice siempre).
 */
export function rowDetail(row: MovementRow, options: { showSpace: boolean }): RowDetail {
  const parts: string[] = [];
  if (row.spaceName != null && (options.showSpace || row.formerSpace)) parts.push(row.spaceName);
  if (row.payerLabel != null) parts.push(row.payerLabel);
  if (row.note != null) parts.push(row.note);

  const effect =
    row.effect != null && row.effectKind != null && row.effectKind !== 'method'
      ? { kind: row.effectKind, text: row.effect }
      : null;

  return { caption: parts.length > 0 ? parts.join(' · ') : null, effect };
}

/* ── Las puertas de la variante B ─────────────────────────────────────────── */

export type MovementDoor = {
  key: MovementFilter;
  kind: 'all' | 'personal' | 'space' | 'spaces';
  title: string;
  caption: string;
  /** "1 para revisar" (K10). */
  extra: string | null;
  attention: boolean;
};

function lastSeen(
  rows: readonly MovementRow[],
  today: IsoDate,
  rowLabel: (row: MovementRow) => string,
): string {
  const last = rows[0];
  if (last == null) return '';

  let when = formatDayMonth(last.date);
  if (last.date === today) when = 'hoy';
  else if (last.date === addDays(today, -1)) when = 'ayer';
  return `el último: ${rowLabel(last)}, ${when}`;
}

/**
 * Las puertas del resumen: los mismos filtros de hoy. Con dos o más espacios,
 * una sola puerta los resume (las puertas no pasan de tres). Una puerta sin
 * registros no se ofrece. En lo compartido la cifra es TU PARTE (K9), sin
 * sumar los pagos entre miembros.
 */
export function movementDoors(args: {
  rows: readonly MovementRow[];
  spaces: readonly SpaceRef[];
  today: IsoDate;
  rowLabel: (row: MovementRow) => string;
  formatAmount: (amount: Pesos) => string;
}): MovementDoor[] {
  const { rows, spaces, today, rowLabel, formatAmount } = args;
  if (rows.length === 0) return [];

  const doors: MovementDoor[] = [
    {
      key: 'all',
      kind: 'all',
      title: 'Todos',
      caption: lastSeen(rows, today, rowLabel),
      extra: null,
      attention: false,
    },
  ];
  if (spaces.length === 0) return doors;

  const personal = rows.filter((item) => item.spaceId == null);
  if (personal.length > 0) {
    doors.push({
      key: 'personal',
      kind: 'personal',
      title: 'Personales',
      caption: `${personal.length} · ${lastSeen(personal, today, rowLabel)}`,
      extra: null,
      attention: false,
    });
  }

  const sharedDoor = (
    key: string,
    kind: 'space' | 'spaces',
    title: string,
    scope: readonly MovementRow[],
  ): MovementDoor | null => {
    if (scope.length === 0) return null;
    const myPart = scope
      .filter((item) => item.kind === 'shared-expense')
      .reduce((sum, item) => sum + item.amount, 0);
    const toReview = scope.filter((item) => item.reviewTag != null).length;
    return {
      key,
      kind,
      title,
      caption: `${scope.length} · tu parte ${formatAmount(myPart)}`,
      extra: toReview > 0 ? `${toReview} para revisar` : null,
      attention: toReview > 0,
    };
  };

  if (spaces.length === 1) {
    const only = spaces[0]!;
    const door = sharedDoor(
      only.id,
      'space',
      only.name,
      rows.filter((item) => item.spaceId === only.id),
    );
    if (door != null) doors.push(door);
  } else {
    const door = sharedDoor(
      'shared',
      'spaces',
      'Espacios',
      rows.filter((item) => item.spaceId != null),
    );
    if (door != null) doors.push(door);
  }

  return doors;
}
