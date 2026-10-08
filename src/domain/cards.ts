/**
 * Tarjetas. T-01 a T-05.
 *
 * La tarjeta es un medio para organizar y proyectar compromisos, NO una cuenta
 * bancaria. No modela saldo, límite, crédito disponible, deuda real, pago
 * mínimo, intereses, financiación ni conciliación (T-01, §22).
 *
 * Lo único que hace: dada la fecha de una compra, decidir en qué resumen cae
 * y cuándo se paga.
 */

import {
  addMonths,
  dateInMonth,
  firstDateWithDayAfter,
  firstDateWithDayOnOrAfter,
  monthOf,
  type IsoDate,
  type Month,
} from './calendar';
import type { PaymentMethod } from './types';

/**
 * Cuándo se paga lo comprado con una tarjeta.
 *
 * `dueDate === null` significa que la app conoce el mes pero no el día: en
 * Próximos pagos se muestra "noviembre" y nunca se inventa una fecha (T-05).
 */
export type CardPaymentSchedule = {
  month: Month;
  dueDate: IsoDate | null;
  /** T-05 · la interfaz muestra "Fechas aproximadas". */
  approximate: boolean;
};

export function isCard(method: PaymentMethod | undefined | null): boolean {
  return method?.kind === 'card';
}

/**
 * G-03 · los medios "al contado" (efectivo, débito, billetera, transferencia,
 * otro) se pagan en la fecha del gasto. Solo la tarjeta diferido.
 */
export function isCashLike(method: PaymentMethod | undefined | null): boolean {
  return method == null || method.kind !== 'card';
}

/**
 * T-03 · con cierre y vencimiento conocidos:
 *   cierre      = primera fecha con el día de cierre IGUAL O POSTERIOR a la compra
 *   vencimiento = primera fecha con el día de vencimiento POSTERIOR a ese cierre
 *   mes de pago = mes del vencimiento
 *
 * T-05 · modo aproximado:
 *   solo cierre              → vence el mes siguiente al cierre, sin día
 *   solo vencimiento         → lo comprado en M se paga en M+1, con su día
 *   ninguno de los dos       → lo comprado en M se paga en M+1, sin día
 */
export function resolveCardPayment(card: PaymentMethod, purchaseDate: IsoDate): CardPaymentSchedule {
  const { closingDay, dueDay } = card;

  if (closingDay != null && dueDay != null) {
    const closing = firstDateWithDayOnOrAfter(purchaseDate, closingDay);
    const dueDate = firstDateWithDayAfter(closing, dueDay);
    return { month: monthOf(dueDate), dueDate, approximate: false };
  }

  if (closingDay != null) {
    const closing = firstDateWithDayOnOrAfter(purchaseDate, closingDay);
    return { month: addMonths(monthOf(closing), 1), dueDate: null, approximate: true };
  }

  const nextMonth = addMonths(monthOf(purchaseDate), 1);

  if (dueDay != null) {
    return { month: nextMonth, dueDate: dateInMonth(nextMonth, dueDay), approximate: true };
  }

  return { month: nextMonth, dueDate: null, approximate: true };
}

/**
 * El vencimiento de un mes dado para una tarjeta. Se usa para ubicar las
 * cuotas 2..n, que caen mes a mes después de la primera (Q-02), y para armar
 * el resumen estimado de cada vencimiento (N-10).
 */
export function dueDateInMonth(card: PaymentMethod, month: Month): IsoDate | null {
  return card.dueDay == null ? null : dateInMonth(month, card.dueDay);
}
