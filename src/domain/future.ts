/**
 * Futuro. §23, N-04 (meses futuros), CA-38.
 *
 * "Futuro es el corazón del producto" (§23). Responde: si sigo con lo que ya
 * tengo registrado, ¿cómo vienen mis próximos meses y qué tengo que pagar?
 *
 * No necesita saber cuánta plata va a tener el usuario, y no lo pretende.
 */

import { addMonths, monthRange, type IsoDate, type Month } from './calendar';
import type { Pesos } from './money';
import { expandPersonalOccurrences, type PersonalExpansion } from './occurrences';
import type { PersonalFacts } from './types';

export type FutureMonth = {
  month: Month;
  /** Tu parte de fijos, cuotas y tarjetas que se pagan ese mes. */
  committed: Pesos;
  /** §23.1 · ingresos recurrentes registrados para ese mes, con ajustes. */
  expectedIncome: Pesos;
  /**
   * N-04 · Ingreso previsto − Comprometido.
   * `null` sin ingreso registrado: no se calcula y se muestra
   * "Sin ingreso registrado".
   */
  unassigned: Pesos | null;
  /** §23.1 · desglose al tocar el mes. */
  breakdown: {
    fixed: Pesos;
    installments: Pesos;
    cards: { cardId: string; amount: Pesos }[];
    fromSpaces: Pesos;
  };
};

export type EndingInstallments = {
  month: Month;
  count: number;
  /** §33 · "tu comprometido baja $X por mes". Nunca "se liberan". */
  monthlyDrop: Pesos;
};

export type Future = {
  months: FutureMonth[];
  /** §23.1 · RECOMENDACIÓN: la línea de cuotas que terminan. */
  endingInstallments: EndingInstallments[];
};

export function calculateFuture(
  expansion: PersonalExpansion,
  from: Month,
  count = 6,
): Future {
  const months = monthRange(from, count);

  const futureMonths: FutureMonth[] = months.map((month) => {
    const committedOccurrences = expansion.occurrences.filter(
      (occurrence) => occurrence.month === month && occurrence.bucket === 'committed',
    );

    const committed = committedOccurrences.reduce(
      (total, occurrence) => total + occurrence.myShare,
      0,
    );
    const expectedIncome = expansion.incomes
      .filter((income) => income.month === month && income.isRecurrence)
      .reduce((total, income) => total + income.amount, 0);

    const cards = new Map<string, Pesos>();
    for (const occurrence of committedOccurrences) {
      if (occurrence.cardId == null) continue;
      cards.set(occurrence.cardId, (cards.get(occurrence.cardId) ?? 0) + occurrence.myShare);
    }

    return {
      month,
      committed,
      expectedIncome,
      unassigned: expectedIncome === 0 ? null : expectedIncome - committed,
      breakdown: {
        fixed: committedOccurrences
          .filter((occurrence) => occurrence.isRecurrence)
          .reduce((total, occurrence) => total + occurrence.myShare, 0),
        installments: committedOccurrences
          .filter((occurrence) => occurrence.installment != null)
          .reduce((total, occurrence) => total + occurrence.myShare, 0),
        cards: [...cards.entries()].map(([cardId, amount]) => ({ cardId, amount })),
        fromSpaces: committedOccurrences
          .filter((occurrence) => occurrence.spaceId != null)
          .reduce((total, occurrence) => total + occurrence.myShare, 0),
      },
    };
  });

  return { months: futureMonths, endingInstallments: findEndingInstallments(expansion, months) };
}

/**
 * §23.1 · "En marzo terminan 2 cuotas: tu comprometido baja $80.000 por mes."
 *
 * Se detecta una cuota que termina cuando su última ocurrencia cae dentro del
 * horizonte: el mes SIGUIENTE ya no la tiene.
 */
function findEndingInstallments(
  expansion: PersonalExpansion,
  months: readonly Month[],
): EndingInstallments[] {
  const lastByPurchase = new Map<string, { month: Month; amount: Pesos }>();

  for (const occurrence of expansion.occurrences) {
    if (occurrence.installment == null) continue;
    if (occurrence.installment.index !== occurrence.installment.count) continue;
    // Identificamos la compra, no la cuota: el id de cuota lleva ":q<n>".
    const purchaseId = occurrence.id.replace(/:q\d+$/, '');
    lastByPurchase.set(purchaseId, { month: occurrence.month, amount: occurrence.myShare });
  }

  const byMonth = new Map<Month, { count: number; monthlyDrop: Pesos }>();
  for (const { month, amount } of lastByPurchase.values()) {
    if (!months.includes(month)) continue;
    const current = byMonth.get(month) ?? { count: 0, monthlyDrop: 0 };
    byMonth.set(month, { count: current.count + 1, monthlyDrop: current.monthlyDrop + amount });
  }

  return [...byMonth.entries()]
    .map(([month, value]) => ({ month: addMonths(month, 1), count: value.count, monthlyDrop: value.monthlyDrop }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** Atajo: expande los hechos sobre el horizonte de Futuro y lo calcula. */
export function futureFrom(facts: PersonalFacts, from: Month, count = 6): Future {
  const to = addMonths(from, count - 1);
  return calculateFuture(expandPersonalOccurrences(facts, { from, to }), from, count);
}

/**
 * §17 · vista previa de una compra en cuotas: cómo cambian Comprometido y Sin
 * asignar de los próximos meses.
 *
 * Nunca dice "te alcanza" ni "no te alcanza" (§33): muestra el destino, no la
 * capacidad de pago.
 */
export type InstallmentPreview = {
  perMonth: Pesos;
  months: {
    month: Month;
    committedBefore: Pesos;
    committedAfter: Pesos;
    unassignedBefore: Pesos | null;
    unassignedAfter: Pesos | null;
  }[];
};

export function previewInstallments(args: {
  before: Future;
  /** Tu parte de cada cuota. */
  myShare: Pesos;
  firstMonth: Month;
  count: number;
}): InstallmentPreview {
  const { before, myShare, firstMonth, count } = args;
  const affected = new Set(monthRange(firstMonth, count));

  return {
    perMonth: myShare,
    months: before.months.map((month) => {
      const delta = affected.has(month.month) ? myShare : 0;
      return {
        month: month.month,
        committedBefore: month.committed,
        committedAfter: month.committed + delta,
        unassignedBefore: month.unassigned,
        unassignedAfter: month.unassigned == null ? null : month.unassigned - delta,
      };
    }),
  };
}

/** §23.3 · "Tus cuotas": cada compra activa, cuánto falta y cuándo termina. */
export type ActiveInstallmentPlan = {
  purchaseId: string;
  label: string;
  current: number;
  count: number;
  /** Tu parte por mes. */
  myShare: Pesos;
  remaining: Pesos;
  endsOn: Month;
  spaceName: string | null;
};

export function activeInstallmentPlans(
  expansion: PersonalExpansion,
  today: IsoDate,
): ActiveInstallmentPlan[] {
  const byPurchase = new Map<string, ActiveInstallmentPlan>();
  const todayMonth = today.slice(0, 7);

  for (const occurrence of expansion.occurrences) {
    if (occurrence.installment == null) continue;
    const purchaseId = occurrence.id.replace(/:q\d+$/, '');
    const plan = byPurchase.get(purchaseId);
    const isPending = occurrence.month >= todayMonth;

    if (plan == null) {
      byPurchase.set(purchaseId, {
        purchaseId,
        label: occurrence.label,
        current: isPending ? occurrence.installment.index : occurrence.installment.index + 1,
        count: occurrence.installment.count,
        myShare: occurrence.myShare,
        remaining: isPending ? occurrence.myShare : 0,
        endsOn: occurrence.month,
        spaceName: occurrence.spaceName,
      });
      continue;
    }

    if (isPending) {
      plan.remaining += occurrence.myShare;
      plan.current = Math.min(plan.current, occurrence.installment.index);
    }
    if (occurrence.month > plan.endsOn) plan.endsOn = occurrence.month;
  }

  return [...byPurchase.values()].filter((plan) => plan.remaining > 0);
}
