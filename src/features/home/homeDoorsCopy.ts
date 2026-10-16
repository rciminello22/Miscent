import { monthOf, type IsoDate, type Month } from '@domain/calendar';
import type { FutureMonth } from '@domain/future';
import type { Pesos } from '@domain/money';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatMonth, formatPaymentWhen } from '@/lib/format';

/**
 * §15 · lo que dicen las puertas (N2) de Inicio. TS puro: cada frase sale de
 * acá y la pantalla solo la dibuja.
 */

/* ── Próximos pagos ───────────────────────────────────────────────────────── */

export type UpcomingDoorContent = { line: string; more: string | null };

const ESTIMATED_STATEMENT = 'resumen estimado';

/**
 * El primer pago, en una línea, y "y N más" por los que no se ven. N-10 · un
 * resumen de tarjeta se rotula "resumen estimado" en su fila; la frase completa
 * ("Estimado según lo que registraste") va una vez en la lista y en el detalle.
 * T-05 · sin día conocido se muestra el mes: nunca se inventa una fecha.
 */
export function upcomingDoorContent(
  payments: readonly UpcomingPayment[],
  formatAmount: (amount: Pesos) => string,
): UpcomingDoorContent | null {
  const [first] = payments;
  if (first == null) return null;

  const parts = [formatPaymentWhen({ date: first.date, month: first.month }), first.label];
  if (first.isEstimate && !/resumen/i.test(first.label)) parts.push(ESTIMATED_STATEMENT);
  parts.push(formatAmount(first.amount));

  const hidden = payments.length - 1;
  return { line: parts.join(' · '), more: hidden > 0 ? `y ${hidden} más` : null };
}

/* ── Próximos meses ───────────────────────────────────────────────────────── */

export type NextMonthsDoorContent = {
  bars: { month: Month; committed: Pesos; exceeds: boolean }[];
  /** El mayor comprometido de la serie, para que las barras sean comparables. */
  maxCommitted: Pesos;
  /** N-08 · el primer mes que queda con Sin asignar negativo; `null` si ninguno. */
  excessPhrase: string | null;
};

/**
 * Las barras de los próximos meses y, si algún mes queda con lo asignado por
 * encima de los ingresos previstos, la frase de N-08 con el mes adelante (sin
 * signo y sin alarma). Solo se nombra el primero. Sin ingreso previsto no se
 * calcula (N-04): no se dice nada.
 */
export function nextMonthsDoorContent(args: {
  months: readonly FutureMonth[];
  today: IsoDate;
  formatAmount: (amount: Pesos) => string;
}): NextMonthsDoorContent {
  const exceeding = (item: FutureMonth) => item.unassigned != null && item.unassigned < 0;

  const bars = args.months.map((item) => ({
    month: item.month,
    committed: item.committed,
    exceeds: exceeding(item),
  }));

  const first = args.months.find(exceeding);
  const excessPhrase =
    first?.unassigned == null
      ? null
      : `En ${formatMonth(first.month, monthOf(args.today))} tus gastos y compromisos superan tus ingresos previstos por ${args.formatAmount(-first.unassigned)}.`;

  return {
    bars,
    maxCommitted: Math.max(0, ...args.months.map((item) => item.committed)),
    excessPhrase,
  };
}

/* ── Tus espacios ─────────────────────────────────────────────────────────── */

/** Con varios espacios, una sola puerta que los resume. Nunca se suman saldos (Caso 17). */
export function spacesDoorCaption(count: number): string {
  return `${count} espacios`;
}
