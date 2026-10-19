import {
  compareDates,
  dateInMonth,
  isSameMonth,
  lastDayOfMonth,
  parseDate,
  parseMonth,
  type IsoDate,
  type Month,
} from '@domain/calendar';
import { formatLongDate, formatWeekday, weekdayIndex } from '@/lib/format';
import type { MovementRow } from './buildMovementList';

/**
 * §16 · la grilla del mes de Movimientos. TS puro.
 *
 * Es una grilla de 7 columnas, de lunes a domingo, con huecos al principio
 * según el día de la semana del 1. De ahí salen las semanas de la franja (cortadas
 * por el borde del mes) y la forma del mes. Cuenta REGISTROS, nunca plata:
 * "cifras por día" está prohibido (CA-00), así que cada día guarda cuántos
 * registros tiene y nada más.
 */

export type CalendarDay = {
  day: number;
  date: IsoDate;
  /** Cuántos registros: "hay" o "no hay" para el punto, y el número para el lector. */
  count: number;
  isToday: boolean;
  /** Todavía no llegó: no se toca. */
  isFuture: boolean;
  /** Lo que anuncia el lector de pantalla. */
  label: string;
};

export type MonthCalendar = {
  weekdays: readonly string[];
  /** Semanas de 7 casilleros; `null` es un hueco (antes del 1 o después del último día). */
  weeks: (CalendarDay | null)[][];
  /** En cuántos días hay al menos un registro. */
  recordDays: number;
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function countLabel(count: number): string {
  if (count === 0) return 'sin registros';
  return count === 1 ? '1 registro' : `${count} registros`;
}

/** "Miércoles 14 de octubre, 2 registros" · hoy: "…, hoy, …" · futuro: "…, todavía no llegó". */
function dayLabel(args: { date: IsoDate; count: number; isToday: boolean; isFuture: boolean }): string {
  const { date, count, isToday, isFuture } = args;
  const when = `${capitalize(formatWeekday(date))} ${formatLongDate(date)}`;
  if (isFuture) return `${when}, todavía no llegó`;
  return isToday ? `${when}, hoy, ${countLabel(count)}` : `${when}, ${countLabel(count)}`;
}

export function buildMonthCalendar(args: {
  month: Month;
  today: IsoDate;
  rows: readonly MovementRow[];
}): MonthCalendar {
  const { month, today, rows } = args;
  const { year, month: m } = parseMonth(month);

  const counts = new Map<IsoDate, number>();
  for (const item of rows) counts.set(item.date, (counts.get(item.date) ?? 0) + 1);

  const days: CalendarDay[] = Array.from({ length: lastDayOfMonth(year, m) }, (_, index) => {
    const day = index + 1;
    const date = dateInMonth(month, day);
    const count = counts.get(date) ?? 0;
    const isToday = date === today;
    const isFuture = compareDates(date, today) > 0;
    return { day, date, count, isToday, isFuture, label: dayLabel({ date, count, isToday, isFuture }) };
  });

  const slots: (CalendarDay | null)[] = [
    ...Array.from({ length: weekdayIndex(dateInMonth(month, 1)) }, () => null),
    ...days,
  ];
  while (slots.length % 7 !== 0) slots.push(null);

  const weeks: (CalendarDay | null)[][] = [];
  for (let start = 0; start < slots.length; start += 7) weeks.push(slots.slice(start, start + 7));

  return {
    weekdays: WEEKDAY_HEADERS,
    weeks,
    recordDays: days.filter((day) => day.count > 0).length,
  };
}

/** Un día sin registros: la frase va en lugar de la lista. */
export function emptyDayMessage(date: IsoDate): string {
  return `No registraste nada el ${formatLongDate(date)}.`;
}

const DATE_PARAM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** El día de la ruta: solo una fecha real y del mes que se está viendo. */
export function parseDayParam(param: string | undefined, month: Month): IsoDate | null {
  if (param == null || !DATE_PARAM.test(param)) return null;
  const { year, month: m, day } = parseDate(param);
  if (day > lastDayOfMonth(year, m)) return null;
  return isSameMonth(param, month) ? param : null;
}
