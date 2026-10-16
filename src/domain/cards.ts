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
  compareDates,
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
 * P24 · los medios que se pueden listar y elegir: sin las tarjetas eliminadas.
 * SOLO para listar y elegir. Los cálculos reciben todos los medios, porque lo ya
 * registrado con una tarjeta eliminada se sigue calculando con ella.
 *
 * `keepId` conserva la eliminada que ya tiene lo que se está editando.
 */
export function activePaymentMethods(
  methods: readonly PaymentMethod[],
  keepId?: string | null,
): PaymentMethod[] {
  return methods.filter((method) => method.deleted !== true || method.id === keepId);
}

/** El nombre con que se muestra un medio: una tarjeta eliminada lo dice. */
export function paymentMethodName(method: PaymentMethod): string {
  return method.deleted === true ? `${method.name} (eliminada)` : method.name;
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
 * T-07 · Q-06 · el último resumen CERRADO a `today`: el que el usuario tiene
 * en la mano al activar la cuenta ("abrí tu último resumen").
 *
 * El cierre es estrictamente anterior a hoy: el día del cierre el resumen
 * todavía recibe compras (T-03). Por eso los consumos de hoy (T-08) caen
 * siempre en el resumen siguiente a este, nunca en el mismo.
 *
 * No repite las reglas de T-03 a T-05: busca la última compra que entró en
 * ese resumen y le pregunta a `resolveCardPayment` cuándo se paga.
 */
export function lastClosedStatement(card: PaymentMethod, today: IsoDate): CardPaymentSchedule {
  return resolveCardPayment(card, lastPurchaseOfClosedStatement(card, today));
}

function lastPurchaseOfClosedStatement(card: PaymentMethod, today: IsoDate): IsoDate {
  const month = monthOf(today);

  // T-05 · sin día de cierre, el "resumen" es el mes calendario: el último
  // cerrado es el del mes pasado.
  if (card.closingDay == null) return dateInMonth(addMonths(month, -1), 31);

  const closingThisMonth = dateInMonth(month, card.closingDay);
  return compareDates(closingThisMonth, today) < 0
    ? closingThisMonth
    : dateInMonth(addMonths(month, -1), card.closingDay);
}

/**
 * T-02 · alguno de los días que la tarjeta SÍ tiene salió de un "Más o menos".
 * Un día `null` ("No sé") no cuenta: no es un día aproximado, es ningún día.
 */
export function hasApproxDay(card: PaymentMethod): boolean {
  return (
    (card.closingDay != null && card.closingApprox) || (card.dueDay != null && card.dueApprox)
  );
}

/**
 * Si la fecha de un resumen se muestra como "~15 nov". Solo cuando hay fecha y
 * alguno de los días que la producen salió de un "Más o menos". Con "No sé" no
 * hay fecha: se muestra el mes (T-05) y no se le pega un "~" encima.
 */
export function isCardDateApprox(card: PaymentMethod, schedule: CardPaymentSchedule): boolean {
  return schedule.dueDate != null && hasApproxDay(card);
}

/**
 * El vencimiento de un mes dado para una tarjeta. Se usa para ubicar las
 * cuotas 2..n, que caen mes a mes después de la primera (Q-02), y para armar
 * el resumen estimado de cada vencimiento (N-10).
 */
export function dueDateInMonth(card: PaymentMethod, month: Month): IsoDate | null {
  return card.dueDay == null ? null : dateInMonth(month, card.dueDay);
}
