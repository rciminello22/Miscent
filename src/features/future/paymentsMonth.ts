/**
 * UX-07 · UX-24 · §23.2 · qué mes muestra la lista de Próximos pagos de Futuro.
 * TS puro: se testea en node.
 *
 * Las barras de §23.1 son los próximos 6 meses, desde el que viene, y el
 * desglose de Comprometido / Sin asignar es de esos meses. La LISTA de pagos
 * puede además mostrar el mes en curso, desde hoy: es lo que promete "Ver todos"
 * de Inicio. Elegir el mes en curso no toca las barras ni su desglose.
 */

import { addMonths, compareMonths, monthOf, type IsoDate, type Month } from '@domain/calendar';
import { upcomingFrom, type UpcomingPayment } from '@domain/upcoming';
import { formatMonth } from '@/lib/format';

/** Valor del parámetro de ruta con el que Inicio abre Futuro en el mes en curso. */
export const CURRENT_MONTH_PARAM = 'actual';

/** Cuántos meses hacia adelante acepta un parámetro con un mes puntual (las barras de §23.1). */
const HORIZON = 6;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * El mes que queda elegido al abrir Futuro: el que viene (§23.1), o el mes en
 * curso si Inicio lo pide. Un parámetro inválido o fuera de rango no rompe nada.
 */
export function initialPaymentsMonth(param: string | undefined, today: IsoDate): Month {
  const current = monthOf(today);
  const next = addMonths(current, 1);

  if (param == null) return next;
  if (param === CURRENT_MONTH_PARAM) return current;

  const inRange =
    MONTH_PATTERN.test(param) &&
    compareMonths(param, current) >= 0 &&
    compareMonths(param, addMonths(current, HORIZON)) <= 0;
  return inRange ? param : next;
}

/** UX-24 · "Pagos de octubre": el bloque dice de qué mes es. */
export function paymentsTitle(month: Month, today: IsoDate): string {
  return `Pagos de ${formatMonth(month, monthOf(today))}`;
}

export type FuturePaymentsView = {
  title: string;
  /** §23.2 · desde hoy en el mes en curso; todos los del mes en uno futuro. */
  payments: UpcomingPayment[];
  isCurrentMonth: boolean;
  /** El desglose de §23.1 es de los meses futuros: no se muestra con el mes en curso. */
  showMonthDetail: boolean;
  /** El mes en curso muestra el bloque aunque esté vacío; uno futuro sin pagos, no. */
  showBlock: boolean;
};

export function futurePaymentsView(args: {
  payments: readonly UpcomingPayment[];
  today: IsoDate;
  selectedMonth: Month;
}): FuturePaymentsView {
  const { today, selectedMonth } = args;
  const isCurrentMonth = selectedMonth === monthOf(today);

  const payments = upcomingFrom(args.payments, today).filter(
    (payment) => payment.month === selectedMonth,
  );

  return {
    title: paymentsTitle(selectedMonth, today),
    payments,
    isCurrentMonth,
    showMonthDetail: !isCurrentMonth,
    showBlock: isCurrentMonth || payments.length > 0,
  };
}
