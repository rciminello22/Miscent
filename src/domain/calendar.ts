/**
 * Calendario. G-01: el mes es el mes calendario en la zona horaria del usuario.
 *
 * Decisión: las fechas de negocio son strings ISO "YYYY-MM-DD" y los meses son
 * strings "YYYY-MM". Nunca se usa `Date` para aritmética de negocio.
 *
 * ¿Por qué? Porque `Date` arrastra hora y zona horaria, y en una app donde
 * "el gasto del 1 de noviembre" tiene que caer en noviembre para los dos
 * miembros, un desfasaje de husos produce un saldo compartido distinto para
 * cada uno. Con componentes enteros eso no puede pasar.
 */

export type IsoDate = string; // "2026-10-20"
export type Month = string; // "2026-10"

export type DateParts = { year: number; month: number; day: number };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function parseDate(iso: IsoDate): DateParts {
  const match = DATE_RE.exec(iso);
  if (!match) throw new Error(`Fecha ISO inválida: "${iso}"`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function parseMonth(month: Month): { year: number; month: number } {
  const match = MONTH_RE.exec(month);
  if (!match) throw new Error(`Mes inválido: "${month}"`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function toIso(year: number, month: number, day: number): IsoDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function toMonth(year: number, month: number): Month {
  return `${pad(year, 4)}-${pad(month)}`;
}

export function monthOf(iso: IsoDate): Month {
  const { year, month } = parseDate(iso);
  return toMonth(year, month);
}

export function dayOf(iso: IsoDate): number {
  return parseDate(iso).day;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** T-04: un día que no existe en el mes se corrige al último día del mes. */
export function clampDay(year: number, month: number, day: number): number {
  const last = lastDayOfMonth(year, month);
  return Math.min(Math.max(day, 1), last);
}

/** La fecha del día `day` dentro de `month`, con T-04 aplicado. */
export function dateInMonth(month: Month, day: number): IsoDate {
  const { year, month: m } = parseMonth(month);
  return toIso(year, m, clampDay(year, m, day));
}

/** Índice absoluto de mes, para comparar y ordenar sin parsear de nuevo. */
export function monthIndex(month: Month): number {
  const { year, month: m } = parseMonth(month);
  return year * 12 + (m - 1);
}

export function monthFromIndex(index: number): Month {
  return toMonth(Math.floor(index / 12), (index % 12) + 1);
}

export function addMonths(month: Month, count: number): Month {
  return monthFromIndex(monthIndex(month) + count);
}

/** Lista de `count` meses consecutivos empezando en `from`. */
export function monthRange(from: Month, count: number): Month[] {
  const start = monthIndex(from);
  return Array.from({ length: count }, (_, index) => monthFromIndex(start + index));
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareMonths(a: Month, b: Month): number {
  return monthIndex(a) - monthIndex(b);
}

export function isSameMonth(iso: IsoDate, month: Month): boolean {
  return monthOf(iso) === month;
}

/** True si la fecha ya llegó respecto de `today`. G-06: "Ya pasó", no "Pagado". */
export function hasPassed(date: IsoDate, today: IsoDate): boolean {
  return compareDates(date, today) <= 0;
}

/**
 * T-03, primera mitad: la primera fecha cuyo día es `day`, igual o posterior
 * a `from`. Se usa para el cierre del resumen.
 *
 * Cierre 25, compra 20/10 → 25/10. Compra 27/10 → 25/11.
 */
export function firstDateWithDayOnOrAfter(from: IsoDate, day: number): IsoDate {
  const { year, month } = parseDate(from);
  const candidate = toIso(year, month, clampDay(year, month, day));
  if (compareDates(candidate, from) >= 0) return candidate;
  return dateInMonth(addMonths(toMonth(year, month), 1), day);
}

/**
 * T-03, segunda mitad: la primera fecha cuyo día es `day`, estrictamente
 * posterior a `from`. Se usa para el vencimiento a partir del cierre.
 *
 * Cierre 25/10, vencimiento día 5 → 5/11.
 */
export function firstDateWithDayAfter(from: IsoDate, day: number): IsoDate {
  const { year, month } = parseDate(from);
  const candidate = toIso(year, month, clampDay(year, month, day));
  if (compareDates(candidate, from) > 0) return candidate;
  return dateInMonth(addMonths(toMonth(year, month), 1), day);
}
