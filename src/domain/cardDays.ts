/**
 * Corregir los días de una tarjeta. T-03, T-05, T-06, Q-02, Q-03, P2, C-05.
 *
 * Qué se mueve al cambiar el cierre o el vencimiento, y los planes de cuotas
 * nuevos. TS puro: `hoy` se inyecta.
 *
 * La regla (§22 "Cambiar fechas recalcula todo lo de esa tarjeta, con aviso"):
 * se recalcula solo lo que se paga ESTE MES O DESPUÉS. Los meses pasados no
 * cambian.
 *
 *   Compras en cuotas   cada compra guarda UN plan (primer mes, cantidad y un día
 *                       de impacto, F2). Se recalcula el día, pero se respetan los
 *                       meses que ya pasaron: si el primer mes guardado es
 *                       anterior al actual, se conserva y solo cambia el día. Si
 *                       es el actual o uno futuro, puede moverse, nunca a un mes
 *                       pasado.
 *   Compras en 1 pago   no guardan nada: su mes sale de la tarjeta (T-03). Entran
 *                       si su resumen no venció y cambian de mes.
 *   Fijos               tampoco guardan nada: cada ocurrencia sale de la tarjeta (F-01).
 *
 * Lo que no guarda nada respeta el pasado porque la tarjeta recuerda los días de
 * antes (`changeCardDays`, `resolveCardStatement`): lo que ya se pagó en un mes
 * anterior se sigue calculando con ellos, así que ningún pago pasado cambia de mes.
 *
 * "Lo fijado a mano" (Q-04) no se distingue: no hay dónde fijarlo.
 */

import {
  addMonths,
  compareMonths,
  dateInMonth,
  monthIndex,
  monthOf,
  type IsoDate,
  type Month,
} from './calendar';
import { changeCardDays, hasApproxDay, isCardDateApprox, resolveCardStatement } from './cards';
import { planInstallments } from './installments';
import type {
  InstallmentPlan,
  PaymentMethod,
  PersonalFacts,
  PersonalMovement,
  Recurrence,
  SharedExpense,
  Slot,
} from './types';

/** Cuándo se paga algo: la fecha, o solo el mes si no se conoce el día (T-05). */
export type PaymentPoint = {
  month: Month;
  date: IsoDate | null;
  /** T-02 · la fecha sale de un día "Más o menos": se muestra "~15 nov". */
  approx: boolean;
};

/** De dónde sale un plan de cuotas: la fila que hay que escribir. */
export type PlanSource =
  | { kind: 'movement'; id: string }
  | { kind: 'sharedExpense'; id: string; spaceId: string; mySlot: Slot };

/** Un plan de cuotas que cambia: lo que había y lo que queda. */
export type PlanWrite = {
  source: PlanSource;
  previous: InstallmentPlan;
  plan: InstallmentPlan;
};

export type CardDaysChangeItem = {
  key: string;
  kind: 'purchase' | 'installments' | 'fixed';
  label: string;
  /** Una compra o un fijo de un espacio. */
  spaceName: string | null;
  otherMemberName: string | null;
  /** La primera cuota que se paga este mes o después. */
  installment: { index: number; count: number } | null;
  before: PaymentPoint;
  after: PaymentPoint;
};

export type CardDaysPlan = {
  /** Lo que se ve moverse: una compra o un fijo es UN pago, con sus cuotas que siguen. */
  items: CardDaysChangeItem[];
  /** Los planes de cuotas que hay que escribir (incluye los que no se ven moverse). */
  writes: PlanWrite[];
  /** El primer mes que se toca. */
  fromMonth: Month | null;
};

/** Cuántos meses hacia adelante se miran las ocurrencias de un fijo. */
const FIXED_LOOKAHEAD = 12;

const EMPTY: CardDaysPlan = { items: [], writes: [], fromMonth: null };

function laterMonth(a: Month, b: Month): Month {
  return compareMonths(a, b) >= 0 ? a : b;
}

function earlierMonth(a: Month, b: Month): Month {
  return compareMonths(a, b) <= 0 ? a : b;
}

function samePlan(a: InstallmentPlan, b: InstallmentPlan): boolean {
  return (
    a.count === b.count &&
    a.firstMonth === b.firstMonth &&
    a.impactDay === b.impactDay &&
    a.approximate === b.approximate
  );
}

function samePoint(a: PaymentPoint, b: PaymentPoint): boolean {
  return a.month === b.month && a.date === b.date;
}

/**
 * El plan de una compra en cuotas con los días nuevos (Q-02), respetando los
 * meses que ya pasaron: el primer mes guardado se conserva si ya pasó, y si no,
 * puede moverse pero no a un mes pasado.
 */
function replan(
  stored: InstallmentPlan,
  purchaseDate: IsoDate,
  card: PaymentMethod,
  current: Month,
): InstallmentPlan {
  const fresh = planInstallments({ purchaseDate, count: stored.count, card });
  const firstMonth =
    compareMonths(stored.firstMonth, current) < 0
      ? stored.firstMonth
      : laterMonth(fresh.firstMonth, current);

  return {
    count: stored.count,
    firstMonth,
    impactDay: fresh.impactDay,
    approximate: fresh.approximate,
  };
}

/** La cuota `index` (1-indexada) de un plan: cuándo se paga. */
function installmentPoint(plan: InstallmentPlan, index: number, card: PaymentMethod): PaymentPoint {
  const month = addMonths(plan.firstMonth, index - 1);
  const date = plan.impactDay == null ? null : dateInMonth(month, plan.impactDay);
  return { month, date, approx: date != null && hasApproxDay(card) };
}

function schedulePoint(card: PaymentMethod, date: IsoDate): PaymentPoint {
  const { schedule, days } = resolveCardStatement(card, date);
  return { month: schedule.month, date: schedule.dueDate, approx: isCardDateApprox(days, schedule) };
}

type Context = {
  before: PaymentMethod;
  after: PaymentMethod;
  current: Month;
  items: CardDaysChangeItem[];
  writes: PlanWrite[];
};

type Owner = { spaceName: string | null; otherMemberName: string | null };

const PERSONAL: Owner = { spaceName: null, otherMemberName: null };

function addInstallments(
  context: Context,
  args: {
    source: PlanSource;
    label: string;
    purchaseDate: IsoDate;
    plan: InstallmentPlan;
    owner: Owner;
  },
): void {
  const { before, after, current } = context;
  const { source, label, purchaseDate, plan, owner } = args;

  // Cuotas que ya pasaron todas: nada que se pague este mes o después.
  const last = addMonths(plan.firstMonth, plan.count - 1);
  if (compareMonths(last, current) < 0) return;

  const next = replan(plan, purchaseDate, after, current);
  if (samePlan(plan, next)) return;

  context.writes.push({ source, previous: plan, plan: next });

  // La primera cuota que se paga este mes o después.
  const index = Math.max(1, monthIndex(current) - monthIndex(plan.firstMonth) + 1);
  const from = installmentPoint(plan, index, before);
  const to = installmentPoint(next, index, after);
  if (samePoint(from, to)) return;

  context.items.push({
    key: `${source.kind}:${source.id}`,
    kind: 'installments',
    label,
    ...owner,
    installment: { index, count: plan.count },
    before: from,
    after: to,
  });
}

function addPurchase(
  context: Context,
  args: { key: string; label: string; date: IsoDate; owner: Owner },
): void {
  const { before, after, current } = context;
  const from = schedulePoint(before, args.date);
  const to = schedulePoint(after, args.date);

  // Solo lo que se paga este mes o después, y que cambia de mes.
  if (compareMonths(from.month, current) < 0 || from.month === to.month) return;

  context.items.push({
    key: args.key,
    kind: 'purchase',
    label: args.label,
    ...args.owner,
    installment: null,
    before: from,
    after: to,
  });
}

function addFixed(
  context: Context,
  args: { recurrence: Recurrence; owner: Owner },
): void {
  const { before, after, current } = context;
  const { recurrence, owner } = args;
  if (recurrence.kind !== 'expense') return;

  const lastMonth = addMonths(current, FIXED_LOOKAHEAD);
  const end =
    recurrence.endMonth == null ? lastMonth : earlierMonth(recurrence.endMonth, lastMonth);

  let shown: { from: PaymentPoint; to: PaymentPoint } | null = null;

  for (
    let month = recurrence.startMonth;
    compareMonths(month, end) <= 0;
    month = addMonths(month, 1)
  ) {
    // Un fijo siempre tiene día (la base lo exige); sin él, al cierre del mes.
    const date = dateInMonth(month, recurrence.dayOfMonth ?? 31);
    const from = schedulePoint(before, date);
    const to = schedulePoint(after, date);

    if (shown == null && compareMonths(from.month, current) >= 0 && !samePoint(from, to)) {
      shown = { from, to };
    }
  }

  if (shown == null) return;

  context.items.push({
    key: `recurrence:${recurrence.id}`,
    kind: 'fixed',
    label: recurrence.description ?? recurrence.category,
    ...owner,
    installment: null,
    before: shown.from,
    after: shown.to,
  });
}

function labelOf(item: PersonalMovement | SharedExpense): string {
  return item.description ?? item.category;
}

function hasPlan(plan: InstallmentPlan | null): plan is InstallmentPlan {
  return plan != null && plan.count >= 2;
}

/**
 * Lo de un espacio que pagó este usuario con ESTA tarjeta (C-05): el detalle de
 * pago del otro miembro no es de este usuario, y no se toca.
 */
function addMembership(
  context: Context,
  membership: PersonalFacts['spaces'][number],
  cardId: string,
): void {
  const { space } = membership.facts;
  const other = space.members.find((member) => member.slot !== membership.mySlot);
  const owner: Owner = { spaceName: space.name, otherMemberName: other?.displayName ?? null };

  const paidWithCard = (sourceId: string) =>
    membership.paymentDetails.some(
      (detail) =>
        detail.sourceId === sourceId &&
        detail.slot === membership.mySlot &&
        detail.paymentMethodId === cardId,
    );

  for (const expense of membership.facts.expenses) {
    if (expense.payerSlot === membership.mySlot && paidWithCard(expense.id)) {
      addSharedExpense(context, expense, { spaceId: space.id, mySlot: membership.mySlot, owner });
    }
  }

  for (const recurrence of membership.facts.recurrences) {
    const mine = recurrence.spaceId != null && recurrence.payerSlot === membership.mySlot;
    if (mine && paidWithCard(recurrence.id)) addFixed(context, { recurrence, owner });
  }
}

function addSharedExpense(
  context: Context,
  expense: SharedExpense,
  where: { spaceId: string; mySlot: Slot; owner: Owner },
): void {
  if (hasPlan(expense.installments)) {
    addInstallments(context, {
      source: {
        kind: 'sharedExpense',
        id: expense.id,
        spaceId: where.spaceId,
        mySlot: where.mySlot,
      },
      label: labelOf(expense),
      purchaseDate: expense.date,
      plan: expense.installments,
      owner: where.owner,
    });
    return;
  }

  // P19 · el saldo se mueve en la fecha de compra: solo cambia el mes en que lo
  // paga este usuario.
  addPurchase(context, {
    key: `sharedExpense:${expense.id}`,
    label: labelOf(expense),
    date: expense.date,
    owner: where.owner,
  });
}

function sortedByPaymentMonth(items: CardDaysChangeItem[]): CardDaysChangeItem[] {
  return [...items].sort(
    (a, b) =>
      compareMonths(a.before.month, b.before.month) ||
      (a.before.date ?? '').localeCompare(b.before.date ?? '') ||
      a.key.localeCompare(b.key),
  );
}

/**
 * Qué se mueve al pasar la tarjeta de `before` a `after`, y los planes de
 * cuotas nuevos. Si el cierre y el vencimiento no cambian, no se toca nada
 * (ni siquiera un plan fijado a mano).
 */
export function planCardDaysChange(args: {
  before: PaymentMethod;
  after: PaymentMethod;
  facts: PersonalFacts;
  today: IsoDate;
}): CardDaysPlan {
  const { before, facts, today } = args;

  if (before.closingDay === args.after.closingDay && before.dueDay === args.after.dueDay) {
    return EMPTY;
  }

  // La tarjeta de después recuerda los días de antes: lo pasado se calcula con
  // ellos y nunca cambia de mes (T-03, T-06).
  const after = changeCardDays(before, args.after, today);

  const cardId = before.id;
  const context: Context = {
    before,
    after,
    current: monthOf(today),
    items: [],
    writes: [],
  };

  for (const movement of facts.movements) {
    if (movement.kind !== 'expense' || movement.paymentMethodId !== cardId) continue;

    if (hasPlan(movement.installments)) {
      addInstallments(context, {
        source: { kind: 'movement', id: movement.id },
        label: labelOf(movement),
        purchaseDate: movement.date,
        plan: movement.installments,
        owner: PERSONAL,
      });
    } else {
      addPurchase(context, {
        key: `movement:${movement.id}`,
        label: labelOf(movement),
        date: movement.date,
        owner: PERSONAL,
      });
    }
  }

  for (const recurrence of facts.recurrences) {
    if (recurrence.spaceId != null || recurrence.paymentMethodId !== cardId) continue;
    addFixed(context, { recurrence, owner: PERSONAL });
  }

  for (const membership of facts.spaces) {
    // Quien salió de un espacio ya no puede escribir ahí (SA-05).
    if (membership.leftOn == null) addMembership(context, membership, cardId);
  }

  if (context.items.length === 0 && context.writes.length === 0) return EMPTY;

  const items = sortedByPaymentMonth(context.items);
  const fromMonth = items.reduce<Month | null>((first, item) => {
    const month = earlierMonth(item.before.month, item.after.month);
    return first == null ? month : earlierMonth(first, month);
  }, null);

  return { items, writes: context.writes, fromMonth };
}

/** Deshacer: los mismos planes, al revés. */
export function reverseWrites(writes: readonly PlanWrite[]): PlanWrite[] {
  return writes.map((write) => ({
    source: write.source,
    previous: write.plan,
    plan: write.previous,
  }));
}
