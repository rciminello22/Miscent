/**
 * Cuotas. Q-01 a Q-09.
 *
 * La cuota es la razón de ser del producto: es lo que en una planilla exige
 * repartir una compra a mano por seis columnas. Acá se genera sola.
 *
 * Las ocurrencias de cuota NO se persisten (§7.4). Lo único que se guarda es
 * el plan: cantidad, mes de la primera cuota y día de impacto.
 */

import { addMonths, dateInMonth, dayOf, monthOf, type IsoDate, type Month } from './calendar';
import { distribute, type Pesos } from './money';
import { resolveCardPayment } from './cards';
import type { InstallmentPlan, PaymentMethod, Slot } from './types';

export type ScheduledInstallment = {
  /** 1-indexado: "cuota 3 de 6". */
  index: number;
  count: number;
  amount: Pesos;
  month: Month;
  /** `null` cuando se conoce el mes y no el día (T-05). */
  date: IsoDate | null;
  approximate: boolean;
};

/**
 * Q-01 · dos formas de cargar una compra en cuotas:
 *   por total          → cuota = total / cantidad, con el redondeo en la primera
 *   por valor de cuota → total = cuota × cantidad
 *
 * La segunda forma cubre compras con interés sin pedirle al usuario ninguna
 * tasa: él copia el valor de cuota del resumen y listo.
 */
export function installmentAmounts(total: Pesos, count: number): Pesos[] {
  if (count < 2) throw new Error('Q · una compra en cuotas necesita al menos 2 cuotas.');
  return distribute(total, count);
}

export function totalFromInstallmentAmount(installmentAmount: Pesos, count: number): Pesos {
  if (count < 2) throw new Error('Q · una compra en cuotas necesita al menos 2 cuotas.');
  return installmentAmount * count;
}

/**
 * Determina el plan de cuotas de una compra.
 *
 * Q-02 · con tarjeta: la primera cuota cae en el mes de pago de la compra
 *        (el que resuelve T-03); después, mes a mes.
 * Q-03 · sin tarjeta, o pagada por un miembro sin medio cargado: la primera
 *        cuota es un mes después de la compra, el mismo día.
 * Q-04 · el mes de la primera cuota se puede fijar a mano (`pinnedFirstMonth`).
 */
export function planInstallments(args: {
  purchaseDate: IsoDate;
  count: number;
  card: PaymentMethod | null;
  pinnedFirstMonth?: Month | null;
}): InstallmentPlan {
  const { purchaseDate, count, card, pinnedFirstMonth } = args;

  if (card != null && card.kind === 'card') {
    const schedule = resolveCardPayment(card, purchaseDate);
    return {
      count,
      firstMonth: pinnedFirstMonth ?? schedule.month,
      impactDay: card.dueDay,
      approximate: schedule.approximate,
    };
  }

  // Q-03: un mes después de la compra, el mismo día.
  return {
    count,
    firstMonth: pinnedFirstMonth ?? addMonths(monthOf(purchaseDate), 1),
    impactDay: dayOf(purchaseDate),
    approximate: false,
  };
}

/**
 * Lo único que define el plan de cuotas de un gasto ya cargado. El monto, el
 * reparto, la categoría y la descripción NO están acá a propósito: cambian las
 * cuotas (monto) o las partes (C-02), pero no en qué mes ni qué día caen.
 */
export type PlanDefiningFacts = {
  date: IsoDate;
  installmentCount: number | null;
  /** Solo en gastos compartidos. */
  payerSlot?: Slot;
  /**
   * El medio de quien paga, tal como lo ve QUIEN EDITA. Si paga el otro
   * miembro es `null` siempre (PR-02: su medio es privado), así que un cambio
   * ahí no se puede ver ni se puede recalcular.
   */
  payerMethodId: string | null;
};

/**
 * X-04 · ¿esta edición obliga a rearmar el plan de cuotas?
 *
 * El plan se persiste (F2) porque el día de impacto y el primer mes salen de la
 * tarjeta de quien pagó, que el otro miembro no ve (PR-02). Rearmarlo cuando la
 * edición no lo afecta lo pisaría con un cálculo sin tarjeta (Q-03).
 */
export function shouldReplan(before: PlanDefiningFacts, after: PlanDefiningFacts): boolean {
  const hasPlan = (count: number | null) => count != null && count >= 2;
  // Un solo pago antes y después: no hay plan que rearmar, cambie lo que cambie.
  if (!hasPlan(before.installmentCount) && !hasPlan(after.installmentCount)) return false;

  return (
    before.installmentCount !== after.installmentCount ||
    before.date !== after.date ||
    before.payerSlot !== after.payerSlot ||
    before.payerMethodId !== after.payerMethodId
  );
}

/** Expande el plan a sus `count` ocurrencias, una por mes consecutivo. */
export function scheduleInstallments(total: Pesos, plan: InstallmentPlan): ScheduledInstallment[] {
  const amounts = installmentAmounts(total, plan.count);

  return amounts.map((amount, index) => {
    const month = addMonths(plan.firstMonth, index);
    return {
      index: index + 1,
      count: plan.count,
      amount,
      month,
      date: plan.impactDay == null ? null : dateInMonth(month, plan.impactDay),
      approximate: plan.approximate,
    };
  });
}

/**
 * Q-06 · cuotas existentes al activar la cuenta personal.
 *
 * El usuario copia del resumen "voy por la cuota k de n, de $C". Se generan
 * las n − k cuotas que faltan, desde el mes siguiente a ese último resumen.
 */
export function planExistingInstallments(args: {
  installmentAmount: Pesos;
  paidCount: number;
  totalCount: number;
  lastStatementMonth: Month;
  impactDay: number | null;
}): { plan: InstallmentPlan; remainingTotal: Pesos; remaining: number } {
  const { installmentAmount, paidCount, totalCount, lastStatementMonth, impactDay } = args;

  if (paidCount >= totalCount) {
    return {
      plan: { count: 0, firstMonth: lastStatementMonth, impactDay, approximate: impactDay == null },
      remainingTotal: 0,
      remaining: 0,
    };
  }

  const remaining = totalCount - paidCount;
  return {
    plan: {
      count: remaining,
      firstMonth: addMonths(lastStatementMonth, 1),
      impactDay,
      approximate: impactDay == null,
    },
    remainingTotal: installmentAmount * remaining,
    remaining,
  };
}

/**
 * Q-07 · "Terminar ahora": conserva las cuotas pasadas y elimina las futuras.
 * Devuelve el nuevo plan recortado y el total que queda vigente.
 */
export function endInstallmentsNow(
  total: Pesos,
  plan: InstallmentPlan,
  today: IsoDate,
): { plan: InstallmentPlan; total: Pesos } {
  const scheduled = scheduleInstallments(total, plan);
  const todayMonth = monthOf(today);
  const kept = scheduled.filter((item) => item.month <= todayMonth);

  if (kept.length === 0) {
    return { plan: { ...plan, count: 0 }, total: 0 };
  }

  return {
    plan: { ...plan, count: kept.length },
    total: kept.reduce((acc, item) => acc + item.amount, 0),
  };
}
