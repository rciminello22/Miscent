import { monthOf, parseMonth, type IsoDate, type Month } from '@domain/calendar';
import { scheduleInstallments, type ScheduledInstallment } from '@domain/installments';
import type { Pesos } from '@domain/money';
import { shareOf, splitInstallmentShares } from '@domain/split';
import type { InstallmentPlan, Slot, Split } from '@domain/types';
import { formatInstallment, formatLongDate, formatMonth, formatPesos } from '@/lib/format';

/**
 * 15·4 · el detalle de una compra en cuotas: el copy y el cálculo, en TS puro.
 *
 * Lo que la app sabe de una cuota es UNA cosa: si su fecha ya pasó. No sabe si
 * la pagaste (G-06, CA-45; decisión cerrada en §37), así que nunca dice "Pagado"
 * ni "Vas pagando": dice "Ya pasaron 3 de 6 cuotas". Y nunca "te queda" ni
 * "queda por pagar" (CA-00): "Faltan $120.000".
 *
 * Los meses salen de las fechas de impacto GUARDADAS (F2), nunca de la tarjeta
 * del otro (PR-02), y van en minúscula dentro de la frase (es-AR, RAE).
 */

export type SegmentState = 'passed' | 'next' | 'future';

export type Fact = { label: string; value: string };

export type InstallmentsDetail = {
  /** Arriba: lo tuyo y, en un compartido, el total de la compra en gris. */
  figure: { amount: Pesos; ofTotal: Pesos | null };
  /** "6 cuotas de $30.000 · compra del 14 de octubre". */
  purchaseLine: string;
  cycle: {
    /** "Faltan $120.000"; `null` si ya pasaron todas. */
    remaining: string | null;
    segments: SegmentState[];
    firstMonth: string;
    lastMonth: string;
    /** "Ya pasaron 3 de 6 cuotas". */
    passed: string;
  };
  /** Próxima, Termina, Medio (solo si pagaste vos) o Pagó, Tu cuota (compartido). */
  facts: Fact[];
  /** La lista de cuotas, abajo, con "ya pasó" en las pasadas. */
  rows: { label: string; when: string; past: boolean; amount: Pesos }[];
};

type SharedInput = {
  purchaseTotal: Pesos;
  /** El total de cada cuota (de los dos), en el mismo orden que `schedule`. */
  installmentTotals: readonly Pesos[];
  payerName: string;
  iPaid: boolean;
};

/**
 * K9 · las cuotas de un gasto compartido tal como las ve quien mira: SU parte de
 * cada una (Q-09, CA-51), en los meses y días GUARDADOS del plan (F2).
 */
export function myInstallmentsOf(
  expense: { amount: Pesos; split: Split; installments: InstallmentPlan },
  mySlot: Slot,
): ScheduledInstallment[] {
  const whole = scheduleInstallments(expense.amount, expense.installments);
  const shares = splitInstallmentShares(
    whole.map((item) => item.amount),
    expense.amount,
    expense.split,
  );
  return whole.map((item, index) => ({
    ...item,
    amount: shares[index] == null ? 0 : shareOf(shares[index], mySlot),
  }));
}

/**
 * Una cuota "ya pasó" cuando su fecha llegó. Si solo se conoce el mes (T-05),
 * cuando el mes ya terminó: nunca se inventa un día.
 */
function hasPassed(item: ScheduledInstallment, today: IsoDate): boolean {
  return item.date != null ? item.date <= today : item.month < monthOf(today);
}

function monthsApart(a: Month, b: Month): number {
  const left = parseMonth(a);
  const right = parseMonth(b);
  return (left.year - right.year) * 12 + (left.month - right.month);
}

/** "abril"; con el año solo si se confundiría con el mismo mes de este año. */
function monthPhrase(month: Month, today: IsoDate): string {
  const name = formatMonth(month);
  return Math.abs(monthsApart(month, monthOf(today))) >= 12
    ? `${name} de ${parseMonth(month).year}`
    : name;
}

function passedPhrase(args: { passed: number; count: number; lastMonth: string }): string {
  const { passed, count, lastMonth } = args;
  if (passed === 0) return 'Todavía no pasó ninguna cuota';
  if (passed === count) return `Ya pasaron las ${count} cuotas · terminó en ${lastMonth}`;
  return `${passed === 1 ? 'Ya pasó' : 'Ya pasaron'} ${passed} de ${count} cuotas`;
}

export function buildInstallmentsDetail(args: {
  today: IsoDate;
  purchaseDate: IsoDate;
  /** Las cuotas tal como las ve quien mira: en un compartido, SU parte de cada una. */
  schedule: readonly ScheduledInstallment[];
  /** `null` en una compra personal. */
  shared: SharedInput | null;
  /** C-05 · el medio con que pagó quien mira; `null` si no pagó él o no lo cargó. */
  methodName: string | null;
}): InstallmentsDetail {
  const { today, purchaseDate, schedule, shared, methodName } = args;
  const first = schedule[0]!;
  const last = schedule[schedule.length - 1]!;
  const count = schedule.length;

  const passedFlags = schedule.map((item) => hasPassed(item, today));
  const passed = passedFlags.filter(Boolean).length;
  const nextIndex = passedFlags.indexOf(false);
  const next = nextIndex === -1 ? null : schedule[nextIndex]!;

  const mine = schedule.reduce((sum, item) => sum + item.amount, 0);
  const remaining = schedule
    .filter((_, index) => !passedFlags[index])
    .reduce((sum, item) => sum + item.amount, 0);

  const lastMonth = monthPhrase(last.month, today);

  const segments = schedule.map((_, index): SegmentState => {
    if (passedFlags[index]) return 'passed';
    return index === nextIndex ? 'next' : 'future';
  });

  const facts: Fact[] = [];
  if (shared != null) {
    const reference = nextIndex === -1 ? 0 : nextIndex;
    facts.push({
      label: 'Tu cuota',
      value: `${formatPesos((next ?? first).amount)} de ${formatPesos(shared.installmentTotals[reference] ?? 0)}`,
    });
  }
  if (next != null) {
    const when =
      next.date != null
        ? `${next.approximate ? '~' : ''}${formatLongDate(next.date)}`
        : monthPhrase(next.month, today);
    facts.push({ label: 'Próxima', value: `${when} · ${formatPesos(next.amount)}` });
    facts.push({ label: 'Termina', value: `en ${lastMonth}` });
  }
  if (shared != null && !shared.iPaid) {
    facts.push({ label: 'Pagó', value: shared.payerName });
  } else if (methodName != null) {
    // C-05 · el medio es privado de quien pagó: solo aparece si pagaste vos.
    facts.push({ label: 'Medio', value: methodName });
  } else if (shared != null) {
    facts.push({ label: 'Pagó', value: 'vos' });
  }

  return {
    figure: {
      amount: mine,
      ofTotal: shared != null && shared.purchaseTotal !== mine ? shared.purchaseTotal : null,
    },
    purchaseLine: `${count} cuotas de ${formatPesos(first.amount)} · compra del ${formatLongDate(purchaseDate)}`,
    cycle: {
      remaining: passed === count ? null : `Faltan ${formatPesos(remaining)}`,
      segments,
      firstMonth: monthPhrase(first.month, today),
      lastMonth,
      passed: passedPhrase({ passed, count, lastMonth }),
    },
    facts,
    rows: schedule.map((item, index) => ({
      label: formatInstallment(item.index, item.count),
      when: `${monthPhrase(item.month, today)}${passedFlags[index] ? ' · ya pasó' : ''}`,
      past: passedFlags[index] ?? false,
      amount: item.amount,
    })),
  };
}
