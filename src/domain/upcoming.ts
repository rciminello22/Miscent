/**
 * Próximos pagos y resumen estimado de tarjeta. N-09, N-10, §23.2.
 *
 * Es la lente "lo que vas a pagar" (§7.3). Responde UNA pregunta:
 * "¿qué pagos que YO realizo se vienen?"
 *
 * No responde cuánto le deben, cuánta plata tiene ni cuánto debe realmente al
 * banco. Y no incluye lo que paga el otro miembro, aunque el usuario tenga una
 * parte en ese gasto (CA-36, CA-50): eso se ve como saldo del espacio, sin
 * fecha.
 *
 * Los montos son el TOTAL que el usuario paga, con la parte del otro aclarada
 * ("incluye $50.000 de Martina"). Nunca es su parte: esa es la otra lente.
 */

import { compareDates, monthOf, type IsoDate, type Month } from './calendar';
import { paymentMethodName } from './cards';
import type { Pesos } from './money';
import type { PersonalExpansion, PersonalOccurrence } from './occurrences';
import type { PaymentMethod } from './types';

export type UpcomingPaymentKind = 'card-statement' | 'fixed' | 'installment' | 'declared-statement';

export type UpcomingPayment = {
  id: string;
  kind: UpcomingPaymentKind;
  /** El resumen de una tarjeta se llama como la tarjeta, nunca como su id. */
  label: string;
  /** El id de la tarjeta de un `card-statement`; `null` en los demás pagos. */
  cardId: string | null;
  /** El monto que el usuario va a pagar. */
  amount: Pesos;
  /** Parte de otro miembro incluida: "incluye $X de Martina". */
  includesOtherShare: Pesos;
  otherMemberName: string | null;
  /** `null` cuando solo se conoce el mes (T-05). */
  date: IsoDate | null;
  month: Month;
  /** T-05 · la interfaz muestra "Fechas aproximadas". */
  approximate: boolean;
  /**
   * T-02 · la fecha sale de un día "Más o menos": "~15 nov" y la marca "aprox.".
   * Solo con fecha: un pago sin día (T-05) muestra el mes, sin "~".
   */
  dateApprox: boolean;
  /** G-06 · "Ya pasó". NUNCA "Pagado" (CA-37, CA-45). */
  hasPassed: boolean;
  /** Para el detalle del resumen estimado: qué lo compone. */
  items: PersonalOccurrence[];
  /** N-10 · todo resumen se rotula "Estimado según lo que registraste". */
  isEstimate: boolean;
};

function sortByDate(a: UpcomingPayment, b: UpcomingPayment): number {
  if (a.date != null && b.date != null) return compareDates(a.date, b.date);
  // Sin día conocido, el pago se ordena al final de su mes.
  const left = a.date ?? `${a.month}-31`;
  const right = b.date ?? `${b.month}-31`;
  return compareDates(left, right);
}

/**
 * N-09 · ocurrencias que paga el propio usuario, agrupadas:
 *   - un resumen estimado por tarjeta y vencimiento
 *   - fijos y cuotas sin tarjeta, cada uno con su fecha
 *   - resúmenes pendientes declarados
 *
 * `paymentMethods` (los mismos hechos con los que se expandió) pone el nombre
 * de la tarjeta en el rótulo del resumen. Es opcional para no tocar a quien
 * solo necesita montos y fechas; sin la tarjeta, el rótulo es "Tarjeta".
 */
export function calculateUpcomingPayments(
  expansion: PersonalExpansion,
  today: IsoDate,
  paymentMethods: readonly PaymentMethod[] = [],
): UpcomingPayment[] {
  // N-09 · solo lo que paga el usuario. Lo que paga el otro miembro no entra
  // acá ni aunque el usuario tenga una parte (CA-50).
  const mine = expansion.occurrences.filter((occurrence) => occurrence.payerIsMe);

  const payments: UpcomingPayment[] = [];

  /* ── N-10 · un resumen estimado por tarjeta y vencimiento ─────────────── */

  const statements = new Map<string, PersonalOccurrence[]>();
  for (const occurrence of mine) {
    if (occurrence.cardId == null) continue;
    if (occurrence.id.startsWith('statement:')) continue; // T-07, va aparte
    const key = `${occurrence.cardId}|${occurrence.month}`;
    const group = statements.get(key);
    if (group) group.push(occurrence);
    else statements.set(key, [occurrence]);
  }

  for (const [key, items] of statements) {
    const [cardId, month] = key.split('|') as [string, Month];
    const first = items[0]!;
    const card = paymentMethods.find((method) => method.id === cardId);
    const amount = items.reduce((total, item) => total + item.total, 0);
    const includesOtherShare = items.reduce((total, item) => total + item.otherShare, 0);
    const otherNames = items.map((item) => item.otherMemberName).filter((name) => name != null);

    payments.push({
      id: `statement:${cardId}:${month}`,
      kind: 'card-statement',
      label: card == null ? 'Tarjeta' : paymentMethodName(card),
      cardId,
      amount,
      includesOtherShare,
      otherMemberName: otherNames[0] ?? null,
      date: first.paymentDate,
      month,
      approximate: items.some((item) => item.approximate),
      dateApprox: first.paymentDate != null && items.some((item) => item.dateApprox),
      hasPassed: first.paymentDate != null && first.paymentDate <= today,
      items,
      // N-10 · siempre rotulado "Estimado según lo que registraste".
      isEstimate: true,
    });
  }

  /* ── Fijos y cuotas sin tarjeta: pagos propios con su fecha ───────────── */

  for (const occurrence of mine) {
    if (occurrence.cardId != null) continue;
    // Los gastos al contado ya registrados no son pagos próximos (§23.2).
    if (occurrence.bucket === 'spent') continue;

    const kind: UpcomingPaymentKind = occurrence.installment != null ? 'installment' : 'fixed';

    payments.push({
      id: occurrence.id,
      kind,
      label: occurrence.label,
      cardId: null,
      amount: occurrence.total,
      includesOtherShare: occurrence.otherShare,
      otherMemberName: occurrence.otherMemberName,
      date: occurrence.paymentDate,
      month: occurrence.month,
      approximate: occurrence.approximate,
      dateApprox: occurrence.dateApprox,
      hasPassed: occurrence.paymentDate != null && occurrence.paymentDate <= today,
      items: [occurrence],
      isEstimate: false,
    });
  }

  /* ── T-07 · resúmenes pendientes declarados: un resumen más ───────────── */

  for (const occurrence of mine) {
    if (!occurrence.id.startsWith('statement:')) continue;
    payments.push({
      id: occurrence.id,
      kind: 'declared-statement',
      label: occurrence.label,
      cardId: null,
      amount: occurrence.total,
      includesOtherShare: 0,
      otherMemberName: null,
      date: occurrence.paymentDate,
      month: occurrence.month,
      approximate: false,
      dateApprox: false,
      hasPassed: occurrence.paymentDate != null && occurrence.paymentDate <= today,
      items: [occurrence],
      isEstimate: true,
    });
  }

  return payments.sort(sortByDate);
}

/** §23.2 · los que todavía no pasaron, desde hoy. */
export function upcomingFrom(payments: readonly UpcomingPayment[], today: IsoDate): UpcomingPayment[] {
  return payments.filter((payment) => {
    if (payment.date != null) return payment.date >= today;
    return payment.month >= monthOf(today);
  });
}

/**
 * §15 · P18 · en Inicio se muestran los 3 primeros pagos de los próximos
 * 30 días.
 */
export function upcomingForHome(
  payments: readonly UpcomingPayment[],
  today: IsoDate,
  limit = 3,
): UpcomingPayment[] {
  const horizon = addDays(today, 30);
  return upcomingFrom(payments, today)
    .filter((payment) => (payment.date == null ? payment.month <= monthOf(horizon) : payment.date <= horizon))
    .slice(0, limit);
}

function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(shifted.getUTCFullYear()).padStart(4, '0'),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * N-10 · el resumen estimado de una tarjeta para un vencimiento: la suma de lo
 * registrado con esa tarjeta que vence ahí, POR EL TOTAL PAGADO, incluidas las
 * partes de otros miembros.
 *
 * No reconstruye el resumen real: no modela límite, intereses, pago mínimo ni
 * financiación (T-01, §22).
 */
export function estimatedStatement(
  expansion: PersonalExpansion,
  cardId: string,
  month: Month,
): { amount: Pesos; includesOtherShare: Pesos; items: PersonalOccurrence[] } {
  const items = expansion.occurrences.filter(
    (occurrence) =>
      occurrence.payerIsMe && occurrence.cardId === cardId && occurrence.month === month,
  );

  return {
    amount: items.reduce((total, item) => total + item.total, 0),
    includesOtherShare: items.reduce((total, item) => total + item.otherShare, 0),
    items,
  };
}
