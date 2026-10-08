/**
 * Radar del mes. N-01 a N-08, D1.
 *
 * Es la lente "tu parte" (§7.3): de un gasto compartido cuenta SOLO la parte
 * que le corresponde al usuario (K9).
 *
 * El punto más delicado de todo el producto está acá:
 *
 *   Sin asignar = Ingresos registrados − (Gastado + Comprometido)
 *
 * y significa "ingresos registrados que todavía no tienen un gasto o
 * compromiso registrado asociado". NO es dinero disponible, no es un saldo y
 * no es plata en una cuenta. La app no sabe cuánto dinero real tiene el
 * usuario (G-04) y nunca lo afirma (G-05).
 */

import type { Month } from './calendar';
import type { Pesos } from './money';
import {
  expandPersonalOccurrences,
  type PersonalExpansion,
  type PersonalOccurrence,
} from './occurrences';
import type { PersonalFacts } from './types';

export type Radar = {
  month: Month;
  /** N-01 · recurrentes del mes (con ajustes) + puntuales con fecha en el mes. */
  registeredIncome: Pesos;
  /** N-03 · tu parte de gastos al contado no recurrentes con fecha en el mes. */
  spent: Pesos;
  /** N-02 · tu parte de fijos, cuotas y resúmenes con mes de pago en este mes. */
  committed: Pesos;
  /** N-04 · Gastado + Comprometido. */
  assigned: Pesos;
  /**
   * N-04 · Ingresos registrados − Asignado.
   * `null` cuando no hay ingresos registrados: en ese caso no se calcula y la
   * pantalla invita a registrar el ingreso (CA-03).
   */
  unassigned: Pesos | null;
  /** N-08 · verdadero cuando los gastos y compromisos superan los ingresos. */
  exceedsIncome: boolean;
  /**
   * §15 · "Con tarjeta este mes": tu parte de compras con tarjeta hechas en
   * este mes que se pagan después, agrupadas por el mes en que se pagan.
   */
  cardPurchasesThisMonth: { month: Month; amount: Pesos }[];
};

function sumShares(occurrences: readonly PersonalOccurrence[]): Pesos {
  return occurrences.reduce((total, occurrence) => total + occurrence.myShare, 0);
}

export function calculateRadar(
  expansion: PersonalExpansion,
  month: Month,
): Radar {
  const { occurrences, incomes } = expansion;

  const registeredIncome = incomes
    .filter((income) => income.month === month)
    .reduce((total, income) => total + income.amount, 0);

  const inMonth = occurrences.filter((occurrence) => occurrence.month === month);
  const spent = sumShares(inMonth.filter((occurrence) => occurrence.bucket === 'spent'));
  const committed = sumShares(inMonth.filter((occurrence) => occurrence.bucket === 'committed'));
  const assigned = spent + committed;

  // §15 · compras con tarjeta de ESTE mes que se pagan en otro.
  const byPaymentMonth = new Map<Month, Pesos>();
  for (const occurrence of occurrences) {
    if (occurrence.cardId == null) continue;
    if (occurrence.purchaseMonth !== month) continue;
    if (occurrence.month === month) continue; // ya está contado en Comprometido
    // Solo la primera cuota corresponde a la compra de este mes; las demás son
    // compromisos de meses siguientes y ya aparecen en Futuro.
    if (occurrence.installment != null && occurrence.installment.index !== 1) continue;
    byPaymentMonth.set(
      occurrence.month,
      (byPaymentMonth.get(occurrence.month) ?? 0) + occurrence.myShare,
    );
  }

  return {
    month,
    registeredIncome,
    spent,
    committed,
    assigned,
    // CA-03 · sin ingresos registrados, Sin asignar no se calcula.
    unassigned: registeredIncome === 0 ? null : registeredIncome - assigned,
    exceedsIncome: registeredIncome > 0 && assigned > registeredIncome,
    cardPurchasesThisMonth: [...byPaymentMonth.entries()]
      .map(([paymentMonth, amount]) => ({ month: paymentMonth, amount }))
      .sort((a, b) => (a.month < b.month ? -1 : 1)),
  };
}

/** Atajo: expande los hechos y calcula el radar de un mes. */
export function radarForMonth(facts: PersonalFacts, month: Month): Radar {
  return calculateRadar(expandPersonalOccurrences(facts, { from: month, to: month }), month);
}

/**
 * §15 · "¿De dónde sale?" · CA-04, CA-52.
 *
 * Devuelve los componentes de cada cifra para que el usuario pueda abrirla y
 * ver de qué está hecha, como ver la fórmula de una celda (§4.10).
 */
export type RadarBreakdown = {
  spent: PersonalOccurrence[];
  committed: PersonalOccurrence[];
  incomeTotal: Pesos;
  spentTotal: Pesos;
  committedTotal: Pesos;
  unassigned: Pesos | null;
};

export function radarBreakdown(expansion: PersonalExpansion, month: Month): RadarBreakdown {
  const radar = calculateRadar(expansion, month);
  const inMonth = expansion.occurrences.filter((occurrence) => occurrence.month === month);

  return {
    spent: inMonth.filter((occurrence) => occurrence.bucket === 'spent'),
    committed: inMonth.filter((occurrence) => occurrence.bucket === 'committed'),
    incomeTotal: radar.registeredIncome,
    spentTotal: radar.spent,
    committedTotal: radar.committed,
    unassigned: radar.unassigned,
  };
}
