import { addMonths, compareMonths, type Month } from '@domain/calendar';
import { formatMonth, formatPesos } from '@/lib/format';

/**
 * El mes del espacio: el selector del Detalle del mes y la puerta que lo abre.
 * TS puro.
 */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** El mes que pide la ruta (`?mes=2026-11`); sin parámetro o con basura, el actual. */
export function parseMonthParam(value: string | undefined, fallback: Month): Month {
  return value != null && MONTH_PATTERN.test(value) ? value : fallback;
}

/**
 * El rango por el que se puede mover el selector: del primer mes con
 * movimientos al último compromiso (§23.4), y siempre incluye el mes en curso.
 */
export function monthBounds(input: { months: readonly Month[]; current: Month }): {
  min: Month;
  max: Month;
} {
  const all = [...input.months, input.current].sort(compareMonths);
  return { min: all[0]!, max: all[all.length - 1]! };
}

/** Los meses vecinos del elegido; `null` donde ya no hay más. */
export function stepMonths(
  selected: Month,
  bounds: { min: Month; max: Month },
): { prev: Month | null; next: Month | null } {
  const prev = addMonths(selected, -1);
  const next = addMonths(selected, 1);
  return {
    prev: compareMonths(prev, bounds.min) >= 0 ? prev : null,
    next: compareMonths(next, bounds.max) <= 0 ? next : null,
  };
}

/** "Octubre · $700.000 entre los dos": la puerta del mes. */
export function monthDoorCopy(input: { month: Month; currentMonth: Month; total: number }): {
  title: string;
  value: string | null;
  caption: string;
} {
  const name = formatMonth(input.month, input.currentMonth);
  const title = name.charAt(0).toUpperCase() + name.slice(1);

  if (input.total <= 0) return { title, value: null, caption: 'Lo que se viene' };
  return { title, value: formatPesos(input.total, { sign: 'never' }), caption: 'entre los dos' };
}

/**
 * La barra de dos tramos de la puerta del mes: lo que puso cada uno ESE mes.
 * Un pago entre ustedes no la cambia (P-04): por eso está rotulada así y no
 * compite con el saldo. Es solo para dibujar el ancho de cada tramo.
 */
export function contributionSplit(input: { me: number; other: number }): {
  me: number;
  other: number;
} | null {
  const total = input.me + input.other;
  if (total <= 0) return null;
  return { me: input.me / total, other: input.other / total };
}
