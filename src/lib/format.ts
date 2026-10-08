/**
 * Formato de montos, meses y fechas, en castellano rioplatense.
 *
 * Está implementado a mano y no con Intl por dos razones: es determinista en
 * cualquier dispositivo (Hermes puede venir sin los datos de locale), y es
 * trivial de testear.
 *
 * G-02 · montos enteros en pesos. Nunca decimales: la app no los pide ni los
 * muestra.
 */

import type { IsoDate, Month } from '@domain/calendar';
import { parseDate, parseMonth } from '@domain/calendar';
import type { Pesos } from '@domain/money';

/** $1.200.000 · separador de miles con punto, sin decimales. */
export function formatPesos(amount: Pesos, options?: { sign?: 'auto' | 'never' }): string {
  const showSign = (options?.sign ?? 'auto') === 'auto' && amount < 0;
  const digits = Math.abs(Math.round(amount)).toString();

  let grouped = '';
  for (let index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 === 0) grouped += '.';
    grouped += digits[index];
  }

  return `${showSign ? '−' : ''}$${grouped}`;
}

/** Sin el signo $, para cuando el contexto ya lo dice. */
export function formatNumber(amount: Pesos): string {
  return formatPesos(amount, { sign: 'never' }).slice(1);
}

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

function monthName(index: number): string {
  return MONTH_NAMES[index - 1] ?? '';
}

function monthShort(index: number): string {
  return MONTH_SHORT[index - 1] ?? '';
}

/** "octubre" · si el año no es el de referencia, "octubre de 2027". */
export function formatMonth(month: Month, reference?: Month): string {
  const { year, month: m } = parseMonth(month);
  const name = monthName(m);
  if (reference == null) return name;
  return year === parseMonth(reference).year ? name : `${name} de ${year}`;
}

/** "Nov" · para las barras de Futuro, donde el espacio es poco. */
export function formatMonthShort(month: Month): string {
  const { month: m } = parseMonth(month);
  const short = monthShort(m);
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/** "5 oct" · el formato de Próximos pagos (§15). */
export function formatDayMonth(date: IsoDate): string {
  const { month, day } = parseDate(date);
  return `${day} ${monthShort(month)}`;
}

/** "5 de noviembre" · para textos corridos. */
export function formatLongDate(date: IsoDate): string {
  const { month, day } = parseDate(date);
  return `${day} de ${monthName(month)}`;
}

/**
 * §22 · "Se paga en noviembre". T-05 · cuando no se conoce el día, se muestra
 * el mes y NUNCA se inventa una fecha.
 */
export function formatPaymentWhen(args: { date: IsoDate | null; month: Month }): string {
  return args.date != null ? formatDayMonth(args.date) : formatMonth(args.month);
}

/** "3 de 6" · §20. */
export function formatInstallment(index: number, count: number): string {
  return `${index} de ${count}`;
}
