/**
 * Revisión de lo que carga el otro (opción B, 14/10).
 *
 * Lo que carga Martina cuenta enseguida y es igual para los dos: un solo
 * saldo. Lo que cambia es que Renzo lo ve "para revisar" hasta que lo mira.
 * Es visibilidad, no un permiso: K3 (los dos crean, editan y eliminan) sigue
 * igual.
 *
 * Por qué no "solo cuenta si lo aceptás": esconder un gasto del radar infla
 * Sin asignar, que es casi decir "te queda" (G-05), y parte el saldo en dos
 * verdades.
 */

import type { DeletedRecord, Review, Slot, SpaceFacts } from './types';

/**
 * Los registros del espacio que el usuario todavía no revisó. Devuelve sus
 * ids: el de un gasto, un fijo o un pago.
 *
 *   gasto · si su último cambio lo hizo el otro y no se revisó DESDE ese
 *           cambio: una edición del otro lo vuelve a poner para revisar
 *   fijo  · igual que un gasto: si su último cambio (o su alta) lo hizo el
 *           otro, incluido un "Este mes fue distinto"
 *   pago  · si lo registró el otro (los pagos no se editan)
 */
export function pendingReview(
  facts: SpaceFacts,
  mySlot: Slot,
  reviews: readonly Review[],
): Set<string> {
  const reviewedAt = new Map(reviews.map((review) => [review.sourceId, Date.parse(review.reviewedAt)]));
  const pending = new Set<string>();

  for (const expense of facts.expenses) {
    if (expense.updatedBySlot === mySlot) continue;
    const reviewed = reviewedAt.get(expense.id);
    if (reviewed == null || reviewed < Date.parse(expense.updatedAt)) pending.add(expense.id);
  }

  for (const recurrence of facts.recurrences) {
    // §21 · los dos lo editan: cuenta quién lo cambió por última vez. Sin
    // autor conocido (personales, o de antes de guardarlo) no se inventa.
    const editor = recurrence.updatedBySlot ?? recurrence.createdBySlot;
    if (editor == null || editor === mySlot) continue;
    const reviewed = reviewedAt.get(recurrence.id);
    if (reviewed == null || reviewed < Date.parse(recurrence.updatedAt)) pending.add(recurrence.id);
  }

  for (const payment of facts.payments) {
    if (payment.recordedBySlot === mySlot) continue;
    if (!reviewedAt.has(payment.id)) pending.add(payment.id);
  }

  return pending;
}

/**
 * Cuánto tiene que haber durado un registro para que su eliminación sea
 * noticia. Menos que esto es Deshacer o un error corregido al toque: quien lo
 * eliminó lo había cargado recién, y el otro nunca llegó a contar con él.
 */
const QUICK_UNDO_MS = 10 * 60 * 1000;

/**
 * Lo que el otro eliminó y el usuario todavía no revisó, lo más reciente
 * primero. Un registro borrado no puede llevar la marca: la lleva su rastro.
 *
 * Una revisión de ANTES de eliminarlo no cuenta: revisaste el gasto, no que
 * desapareciera. Por eso se compara contra `deletedAt`, igual que una edición
 * se compara contra `updatedAt`.
 */
export function pendingDeletions(
  deletions: readonly DeletedRecord[],
  mySlot: Slot,
  reviews: readonly Review[],
): DeletedRecord[] {
  const reviewedAt = new Map(reviews.map((review) => [review.sourceId, Date.parse(review.reviewedAt)]));

  return deletions
    .filter((item) => {
      if (item.deletedBySlot === mySlot) return false;
      // Un rastro de antes de guardar qué era: no se puede decir qué fue.
      if (item.amount == null) return false;

      const deletedAt = Date.parse(item.deletedAt);
      const quickUndo =
        item.createdBySlot === item.deletedBySlot &&
        item.recordCreatedAt != null &&
        deletedAt - Date.parse(item.recordCreatedAt) < QUICK_UNDO_MS;
      if (quickUndo) return false;

      const reviewed = reviewedAt.get(item.sourceId);
      return reviewed == null || reviewed < deletedAt;
    })
    .sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
}
