import {
  compareDates,
  dateInMonth,
  isSameMonth,
  lastDayOfMonth,
  monthOf,
  parseDate,
  parseMonth,
  type IsoDate,
  type Month,
} from '@domain/calendar';
import { formatLongDate, formatMonth, formatWeekday } from '@/lib/format';
import type { MovementRow } from './buildMovementList';
import {
  emptyDayMessage,
  parseDayParam,
  type CalendarDay,
  type MonthCalendar,
} from './calendarGrid';
import type { FilterSegment } from './movementsView';

/**
 * §16 · la pestaña Movimientos reestructurada (16A): UNA pantalla con el N1
 * (hoy y el mes), los filtros, la franja de una semana y la lista del día
 * elegido. Acá vive su lógica, en TS puro.
 *
 * Todo cuenta REGISTROS, nunca plata (CA-00): ninguna función de este módulo
 * recibe ni devuelve un monto.
 */

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** `AAAA-MM`, lo único que se acepta como mes en la ruta. */
const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** El mes con el que arranca la pestaña: el de la ruta si es uno que ya llegó; si no, el actual. */
export function startingMonth(param: string | undefined, today: IsoDate): Month {
  const current = monthOf(today);
  return param != null && MONTH_PARAM.test(param) && param <= current ? param : current;
}

/* ── El estado: qué muestra la lista ──────────────────────────────────────── */

/**
 * Un día elegido y si "Todo el mes" está prendido. El día se conserva mientras
 * el interruptor está prendido: al apagarlo se vuelve a él.
 */
export type Selection = { day: IsoDate; wholeMonth: boolean };

function lastDateOf(month: Month): IsoDate {
  const { year, month: m } = parseMonth(month);
  return dateInMonth(month, lastDayOfMonth(year, m));
}

/**
 * Hoy en el mes en curso. Un mes pasado arranca en "Todo el mes": no hay un día
 * actual. Un día de la ruta (`?dia=`) manda, si es del mes y ya llegó.
 */
export function initialSelection(args: {
  month: Month;
  today: IsoDate;
  day?: IsoDate | null;
}): Selection {
  const { month, today } = args;
  const requested = parseDayParam(args.day ?? undefined, month);
  if (requested != null && compareDates(requested, today) <= 0) {
    return { day: requested, wholeMonth: false };
  }
  return month === monthOf(today)
    ? { day: today, wholeMonth: false }
    : { day: lastDateOf(month), wholeMonth: true };
}

/** Tocar un día cambia la lista (y apaga "Todo el mes"). Un día futuro o de otro mes no responde. */
export function selectDay(
  selection: Selection,
  date: IsoDate,
  args: { month: Month; today: IsoDate },
): Selection {
  if (!isSameMonth(date, args.month) || compareDates(date, args.today) > 0) return selection;
  return { day: date, wholeMonth: false };
}

export function toggleWholeMonth(selection: Selection): Selection {
  return { ...selection, wholeMonth: !selection.wholeMonth };
}

/** El día que filtra la lista, o ninguno con "Todo el mes". */
export function scopeDay(selection: Selection): IsoDate | null {
  return selection.wholeMonth ? null : selection.day;
}

/* ── La franja de una semana ──────────────────────────────────────────────── */

/**
 * Las semanas son las de `buildMonthCalendar`: de lunes a domingo y cortadas en
 * el borde del mes (con huecos antes del 1 y después del último día).
 */
export function weekIndexOf(calendar: MonthCalendar, date: IsoDate): number {
  const index = calendar.weeks.findIndex((week) => week.some((day) => day?.date === date));
  return index === -1 ? 0 : index;
}

/** La franja no avanza más allá de la semana de hoy; en un mes pasado, hasta la última. */
function lastWeekIndex(calendar: MonthCalendar, args: { month: Month; today: IsoDate }): number {
  return args.month === monthOf(args.today)
    ? weekIndexOf(calendar, args.today)
    : calendar.weeks.length - 1;
}

export function stepWeek(
  calendar: MonthCalendar,
  index: number,
  delta: -1 | 1,
  args: { month: Month; today: IsoDate },
): number {
  return Math.min(Math.max(index + delta, 0), lastWeekIndex(calendar, args));
}

export type StripView = {
  week: (CalendarDay | null)[];
  /** "12 al 18 de octubre"; un solo día: "1 de noviembre". */
  range: string;
  canPrevious: boolean;
  canNext: boolean;
};

export function stripView(args: {
  calendar: MonthCalendar;
  weekIndex: number;
  month: Month;
  today: IsoDate;
}): StripView {
  const { calendar, weekIndex, month, today } = args;
  const week = calendar.weeks[weekIndex] ?? [];
  const days = week.filter((day) => day != null);
  const first = days[0];
  const last = days[days.length - 1];

  let range = '';
  if (first != null && last != null) {
    range =
      first.date === last.date
        ? formatLongDate(first.date)
        : `${first.day} al ${formatLongDate(last.date)}`;
  }

  return {
    week,
    range,
    canPrevious: weekIndex > 0,
    canNext: weekIndex < lastWeekIndex(calendar, { month, today }),
  };
}

/* ── El N1: hoy y el mes ──────────────────────────────────────────────────── */

type Figure = { value: number; label: string };

export type MonthFigures = {
  /** "Hoy, domingo 18 de octubre"; en un mes pasado, el mes. */
  heading: string;
  primary: Figure;
  secondary: Figure;
};

/**
 * Las dos cifras grandes. No cambian al elegir un día ni un filtro: reciben
 * todos los registros del mes. En el mes en curso: los de hoy y los del mes. En
 * un mes pasado no hay "hoy": los del mes y en cuántos días hubo.
 */
export function monthFigures(args: {
  rows: readonly MovementRow[];
  month: Month;
  today: IsoDate;
}): MonthFigures {
  const { rows, month, today } = args;
  const name = formatMonth(month, monthOf(today));

  if (month === monthOf(today)) {
    const onToday = rows.filter((row) => row.date === today).length;
    return {
      heading: `Hoy, ${formatWeekday(today)} ${formatLongDate(today)}`,
      primary: { value: onToday, label: plural(onToday, 'registro hoy', 'registros hoy') },
      secondary: { value: rows.length, label: `en ${name}` },
    };
  }

  const days = new Set(rows.map((row) => row.date)).size;
  return {
    heading: capitalize(name),
    primary: {
      value: rows.length,
      label: `${plural(rows.length, 'registro', 'registros')} en ${name}`,
    },
    secondary: { value: days, label: plural(days, 'día con registros', 'días con registros') },
  };
}

export type ShapeDot = {
  day: number;
  date: IsoDate;
  /** Hubo registros ese día. Un "hay" o "no hay": nunca cuántos ni cuánta plata. */
  filled: boolean;
  isToday: boolean;
  isFuture: boolean;
};

/** La forma del mes: un punto por día, para mirar de reojo. No se toca. */
export function monthShape(calendar: MonthCalendar): ShapeDot[] {
  return calendar.weeks
    .flat()
    .filter((day) => day != null)
    .map((day) => ({
      day: day.day,
      date: day.date,
      filled: day.count > 0,
      isToday: day.isToday,
      isFuture: day.isFuture,
    }));
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** K10 · "1 para revisar en Casa", o nada si no hay. */
export function reviewLine(rows: readonly MovementRow[]): string | null {
  const pending = rows.filter((row) => row.reviewTag != null);
  if (pending.length === 0) return null;

  const names: string[] = [];
  for (const row of pending) {
    if (row.spaceName != null && !names.includes(row.spaceName)) names.push(row.spaceName);
  }
  return `${pending.length} para revisar en ${joinNames(names)}`;
}

/* ── La lista ─────────────────────────────────────────────────────────────── */

export type ListHeading = { title: string; count: string | null; text: string };

/** "Hoy, domingo 18 · 3 registros" · "Viernes 9" · "Todo octubre · 14 registros". */
export function listHeading(args: {
  selection: Selection;
  month: Month;
  today: IsoDate;
  count: number;
}): ListHeading {
  const { selection, month, today, count } = args;

  let title: string;
  if (selection.wholeMonth) {
    title = `Todo ${formatMonth(month, monthOf(today))}`;
  } else {
    const dayName = `${formatWeekday(selection.day)} ${parseDate(selection.day).day}`;
    title = selection.day === today ? `Hoy, ${dayName}` : capitalize(dayName);
  }

  const countText = count === 0 ? null : `${count} ${plural(count, 'registro', 'registros')}`;
  return { title, count: countText, text: countText == null ? title : `${title} · ${countText}` };
}

/**
 * Lo que va en lugar de la lista. El de un día es el mismo con cualquier filtro.
 * `anyInMonth` dice si el mes tiene registros sin contar el filtro.
 */
export function emptyListMessage(args: {
  selection: Selection;
  month: Month;
  today: IsoDate;
  anyInMonth: boolean;
}): string {
  const { selection, month, today, anyInMonth } = args;
  if (!selection.wholeMonth) {
    return selection.day === today ? 'Todavía no registraste nada hoy.' : emptyDayMessage(selection.day);
  }
  if (anyInMonth) return 'Sin registros acá este mes.';

  const name = formatMonth(month, monthOf(today));
  return month === monthOf(today)
    ? `Todavía no registraste nada en ${name}.`
    : `No registraste nada en ${name}.`;
}

/* ── Los filtros ──────────────────────────────────────────────────────────── */

/**
 * Con un espacio, el control segmentado de tres tramos; con dos o más, chips
 * desplazables, uno por espacio. Sin espacios no hay nada que filtrar.
 */
export function filterStyle(segments: readonly FilterSegment[]): 'none' | 'segmented' | 'chips' {
  if (segments.length === 0) return 'none';
  return segments.filter((segment) => segment.kind === 'space').length >= 2 ? 'chips' : 'segmented';
}

/* ── Explicar el punto ────────────────────────────────────────────────────── */

export const DOT_HELP_TEXT = 'El punto debajo de un día indica que registraste algo ese día.';

/** La leyenda permanente, junto a la franja: "• días con registros". */
export const DOT_LEGEND = 'días con registros';

/**
 * La ayuda se muestra UNA vez, y solo si hay un punto a la vista que explicar:
 * sin puntos no se gasta la única vez. Mientras se lee la marca (`null`) no se
 * muestra, para que no parpadee.
 */
export function shouldShowDotHelp(args: { remembered: boolean | null; recordDays: number }): boolean {
  return args.remembered === false && args.recordDays > 0;
}
