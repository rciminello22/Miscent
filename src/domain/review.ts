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

import type { Review, Slot, SpaceFacts } from './types';

/**
 * Los registros del espacio que el usuario todavía no revisó. Devuelve sus
 * ids: el de un gasto, un fijo o un pago.
 *
 *   gasto · si su último cambio lo hizo el otro y no se revisó DESDE ese
 *           cambio: una edición del otro lo vuelve a poner para revisar
 *   fijo  · si lo cargó el otro (los compartidos todavía no se editan)
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
    // Sin autor conocido (personales, o de antes de guardarlo) no se inventa.
    if (recurrence.createdBySlot == null || recurrence.createdBySlot === mySlot) continue;
    if (!reviewedAt.has(recurrence.id)) pending.add(recurrence.id);
  }

  for (const payment of facts.payments) {
    if (payment.recordedBySlot === mySlot) continue;
    if (!reviewedAt.has(payment.id)) pending.add(payment.id);
  }

  return pending;
}
