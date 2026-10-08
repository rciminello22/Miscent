/**
 * Saldo compartido y mes del espacio. S-01 a S-06, P-01 a P-04.
 *
 * Es la única cifra de la app a la que le corresponde la palabra "saldo"
 * (§7.2): lo que dos miembros se deben entre ellos, que sí es algo que la app
 * conoce porque lo calcula sobre lo que ellos registraron.
 *
 * Nunca dice cuánta plata tiene cada uno (E-09).
 */

import { compareMonths, monthOf, type IsoDate, type Month } from './calendar';
import type { Pesos } from './money';
import { expandSpaceOccurrences, spaceHorizon, type SpaceOccurrence } from './occurrences';
import { otherSlot, shareOf } from './split';
import type { Slot, SpaceFacts } from './types';

export type SharedBalance = {
  /**
   * S-03 · visto por `slot`. Positivo: el OTRO miembro le debe a `slot`.
   * Negativo: `slot` le debe al otro. Cero: "Están a mano" (S-06).
   */
  amount: Pesos;
  viewerSlot: Slot;
  /** Para armar la frase: "Martina te debe $X" / "Le debés $X a Renzo". */
  otherMemberName: string;
  settled: boolean;
};

/** S-02 · una ocurrencia afecta el saldo cuando su fecha de impacto llegó. */
function hasImpacted(occurrence: SpaceOccurrence, today: IsoDate): boolean {
  return occurrence.balanceDate <= today;
}

/**
 * S-01 · Saldo (visto por un miembro) =
 *     saldo inicial
 *   + Σ (lo que puso − su parte) en ocurrencias compartidas YA OCURRIDAS
 *   − pagos recibidos del otro
 *   + pagos hechos al otro
 *
 * P-04 · un pago entre miembros SOLO modifica esta cifra. No cambia "puso",
 * ni Gastado, ni Comprometido, ni Ingresos registrados de nadie.
 */
export function calculateSharedBalance(
  facts: SpaceFacts,
  viewerSlot: Slot,
  today: IsoDate,
): SharedBalance {
  const occurrences = expandSpaceOccurrences(facts, spaceHorizon(facts, today));
  const other = facts.space.members.find((member) => member.slot !== viewerSlot)!;

  // E-07 · el saldo inicial se guarda siempre a favor del slot 1.
  let amount = viewerSlot === 1 ? facts.space.initialBalance : -facts.space.initialBalance;

  for (const occurrence of occurrences) {
    if (!hasImpacted(occurrence, today)) continue;
    const put = occurrence.payerSlot === viewerSlot ? occurrence.amount : 0;
    amount += put - shareOf(occurrence.shares, viewerSlot);
  }

  for (const payment of facts.payments) {
    if (payment.date > today) continue;
    if (payment.fromSlot === viewerSlot) amount += payment.amount;
    if (payment.toSlot === viewerSlot) amount -= payment.amount;
  }

  return {
    amount,
    viewerSlot,
    otherMemberName: other.displayName,
    settled: amount === 0,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  §24 · El mes del espacio                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export type SpaceMonth = {
  month: Month;
  /** Total compartido del mes. */
  total: Pesos;
  /** S-05 · lo que puso cada miembro y lo que le corresponde. */
  viewer: { put: Pesos; share: Pesos };
  other: { put: Pesos; share: Pesos; name: string };
  /** S-05 · "[Miembro] puso $X de más". Positivo: el viewer puso de más. */
  viewerPutExtra: Pesos;
  /** §24 · el puente con el mes anterior. `null` si no hay mes anterior. */
  previousBalance: Pesos | null;
  /** Pagos entre miembros declarados en el mes. */
  payments: { amount: Pesos; fromSlot: Slot; toSlot: Slot; date: IsoDate }[];
};

/** S-04 · el mes del espacio agrupa las ocurrencias por su fecha de impacto. */
export function calculateSpaceMonth(
  facts: SpaceFacts,
  viewerSlot: Slot,
  month: Month,
  today: IsoDate,
): SpaceMonth {
  const occurrences = expandSpaceOccurrences(facts, spaceHorizon(facts, today)).filter(
    (occurrence) => monthOf(occurrence.balanceDate) === month,
  );
  const other = facts.space.members.find((member) => member.slot !== viewerSlot)!;
  const opposite = otherSlot(viewerSlot);

  let total = 0;
  let viewerPut = 0;
  let viewerShare = 0;
  let otherPut = 0;
  let otherShare = 0;

  for (const occurrence of occurrences) {
    total += occurrence.amount;
    viewerShare += shareOf(occurrence.shares, viewerSlot);
    otherShare += shareOf(occurrence.shares, opposite);
    if (occurrence.payerSlot === viewerSlot) viewerPut += occurrence.amount;
    else otherPut += occurrence.amount;
  }

  // §24 · "Venían de septiembre: Martina había puesto $50.000 de más."
  const previousMonthEnd = lastDayOfPreviousMonth(month);
  const hasPrevious =
    compareMonths(month, spaceHorizon(facts, today).from) > 0 || facts.space.initialBalance !== 0;
  const previousBalance = hasPrevious
    ? calculateSharedBalance(facts, viewerSlot, previousMonthEnd).amount
    : null;

  return {
    month,
    total,
    viewer: { put: viewerPut, share: viewerShare },
    other: { put: otherPut, share: otherShare, name: other.displayName },
    viewerPutExtra: viewerPut - viewerShare,
    previousBalance,
    payments: facts.payments
      .filter((payment) => monthOf(payment.date) === month)
      .map((payment) => ({
        amount: payment.amount,
        fromSlot: payment.fromSlot,
        toSlot: payment.toSlot,
        date: payment.date,
      })),
  };
}

function lastDayOfPreviousMonth(month: Month): IsoDate {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const previousYear = m === 1 ? year - 1 : year;
  const previousMonth = m === 1 ? 12 : m - 1;
  const lastDay = new Date(Date.UTC(previousYear, previousMonth, 0)).getUTCDate();
  return `${String(previousYear).padStart(4, '0')}-${String(previousMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * P-03 · al registrar un pago, la app propone el monto y la dirección que
 * dejan el saldo en cero. Se aceptan parciales y mayores (con aviso).
 */
export function proposeSettlementPayment(
  balance: SharedBalance,
): { fromSlot: Slot; toSlot: Slot; amount: Pesos } | null {
  if (balance.amount === 0) return null;
  const opposite = otherSlot(balance.viewerSlot);

  // Saldo positivo: el otro le debe al viewer → el otro paga.
  return balance.amount > 0
    ? { fromSlot: opposite, toSlot: balance.viewerSlot, amount: balance.amount }
    : { fromSlot: balance.viewerSlot, toSlot: opposite, amount: -balance.amount };
}

/**
 * §25 · aviso de adelanto: si el saldo favorece a quien todavía tiene cuotas
 * compartidas por vencer, se avisa "Martina adelantó $X de cuotas que todavía
 * no vencieron".
 */
export function pendingSharedInstallments(
  facts: SpaceFacts,
  slot: Slot,
  today: IsoDate,
): Pesos {
  return expandSpaceOccurrences(facts, spaceHorizon(facts, today))
    .filter((occurrence) => occurrence.installment != null && occurrence.balanceDate > today)
    .reduce((total, occurrence) => total + shareOf(occurrence.shares, slot), 0);
}
