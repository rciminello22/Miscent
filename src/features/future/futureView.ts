import { monthOf, type IsoDate, type Month } from '@domain/calendar';
import type { ActiveInstallmentPlan, EndingInstallments } from '@domain/future';
import type { Pesos } from '@domain/money';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatMonth, formatPaymentWhen } from '@/lib/format';
import { ESTIMATE_NOTE } from '@/features/upcoming/statementDetail';
import { FUTURE_COPY } from './futureMonthCopy';

/**
 * §23 · lo que dicen el N1 y las puertas de Futuro. TS puro: cada frase sale de
 * acá y la pantalla solo la dibuja.
 */

/* ── Bajo la cifra del mes ────────────────────────────────────────────────── */

export type FutureHeroLine =
  | { kind: 'unassigned'; text: string }
  | { kind: 'exceeds'; text: string; amount: Pesos }
  | { kind: 'noIncome'; text: string };

/**
 * §33 · "Sin asignar $X · según tus ingresos previstos" (D1: la cifra siempre
 * con su ayuda). Con Sin asignar negativo no hay "−$X": es la frase de N-08 con
 * el exceso en positivo. Sin ingreso previsto no se calcula (N-04).
 */
export function futureHeroLine(
  unassigned: Pesos | null,
  formatAmount: (amount: Pesos) => string,
): FutureHeroLine {
  if (unassigned == null) return { kind: 'noIncome', text: FUTURE_COPY.noIncome };
  if (unassigned < 0) return { kind: 'exceeds', text: FUTURE_COPY.exceeds, amount: -unassigned };

  return {
    kind: 'unassigned',
    text: `${FUTURE_COPY.unassigned.label} ${formatAmount(unassigned)} · según tus ingresos previstos`,
  };
}

/**
 * §23.1 · CA-38 · "En marzo terminan 2 cuotas: tu comprometido baja $80.000 por
 * mes." Nunca "se liberan" (§33): es lo comprometido, no plata que aparece.
 */
export function endingInstallmentsLine(
  ending: EndingInstallments,
  reference: Month,
  formatAmount: (amount: Pesos) => string,
): string {
  const verb = ending.count === 1 ? 'termina' : 'terminan';
  const noun = ending.count === 1 ? 'cuota' : 'cuotas';
  return `En ${formatMonth(ending.month, reference)} ${verb} ${ending.count} ${noun}: tu comprometido baja ${formatAmount(ending.monthlyDrop)} por mes.`;
}

/**
 * El mes en curso solo muestra los pagos que faltan, sin desglose: lo que dice
 * el N1 es cuántos, nunca una suma (los pagos son "lo que vas a pagar"; el
 * comprometido es "tu parte": las dos lentes de §7.3 no se mezclan en una cifra).
 */
export function currentMonthHeadline(count: number): string {
  if (count === 0) return 'No tenés más pagos este mes.';
  return count === 1 ? '1 pago desde hoy' : `${count} pagos desde hoy`;
}

/* ── Las puertas ──────────────────────────────────────────────────────────── */

export type FutureDoorContent = { title: string; caption: string };

/** "Próximos pagos de noviembre · 4 pagos · el primero, 1 nov". T-05: sin día, el mes. */
export function paymentsDoor(args: {
  payments: readonly UpcomingPayment[];
  month: Month;
  today: IsoDate;
  isCurrentMonth: boolean;
}): FutureDoorContent | null {
  const [first] = args.payments;
  if (first == null) return null;

  const count = args.payments.length;
  const counted = count === 1 ? '1 pago' : `${count} pagos`;
  const since = args.isCurrentMonth ? ' desde hoy' : '';

  return {
    title: `Próximos pagos de ${formatMonth(args.month, monthOf(args.today))}`,
    caption: `${counted}${since} · el primero, ${formatPaymentWhen({ date: first.date, month: first.month })}`,
  };
}

/** "Tus cuotas · 2 compras activas · la última termina en marzo". */
export function installmentsDoor(
  plans: readonly ActiveInstallmentPlan[],
  today: IsoDate,
): FutureDoorContent | null {
  if (plans.length === 0) return null;

  const last = plans.reduce((latest, plan) => (plan.endsOn > latest ? plan.endsOn : latest), '');
  const counted = plans.length === 1 ? '1 compra activa' : `${plans.length} compras activas`;

  return {
    title: 'Tus cuotas',
    caption: `${counted} · la última termina en ${formatMonth(last, monthOf(today))}`,
  };
}

/** "Tus fijos · 5 fijos". */
export function fixedDoor(count: number): FutureDoorContent | null {
  if (count === 0) return null;
  return { title: 'Tus fijos', caption: count === 1 ? '1 fijo' : `${count} fijos` };
}

/* ── El pie de la lista de pagos ──────────────────────────────────────────── */

const OWN_PAYMENTS =
  'Son los pagos que hacés vos. Lo que paga otra persona, aunque tengas una parte, se ve en el espacio compartido.';

/**
 * Las notas obligatorias de la lista, cada una UNA vez por bloque (N-10, T-05):
 * la fila de cada resumen lo dice corto ("resumen estimado") y acá va la frase
 * completa. Lo último es siempre de quién son estos pagos.
 */
export function paymentsFootnotes(payments: readonly UpcomingPayment[]): string[] {
  const notes: string[] = [];

  if (payments.some((payment) => payment.isEstimate)) {
    notes.push(`Los resúmenes de tarjeta son "${ESTIMATE_NOTE}".`);
  }
  if (payments.some((payment) => payment.approximate)) notes.push('Fechas aproximadas');
  notes.push(OWN_PAYMENTS);

  return notes;
}
