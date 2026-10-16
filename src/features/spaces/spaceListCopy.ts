/**
 * La pastilla de pendientes en la tarjeta de cada espacio (lista de Compartidos).
 * TS puro.
 */

export type PendingCounts = {
  /** SA-04 · fijos que detuvo una salida y que quien queda no decidió. */
  stoppedFixed: number;
  /** Gastos que el otro cargó como pagados por vos, sin medio. */
  paidByOther: number;
  /** K10 · cosas que cargó, editó o eliminó el otro y no revisaste. */
  toReview: number;
};

export function pendingTotal(counts: PendingCounts): number {
  return counts.stoppedFixed + counts.paidByOther + counts.toReview;
}

/** "2 por revisar": solo si hay algo. Sin pendientes no ocupa lugar. */
export function pendingPill(total: number): string | null {
  return total > 0 ? `${total} por revisar` : null;
}
