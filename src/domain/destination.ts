/**
 * X-07 · cambiar el destino de un gasto: personal ↔ espacio.
 *
 * "Solo lo puede hacer quien lo cargó, con confirmación de audiencia." Para
 * pasar un gasto compartido a personal hace falta además haberlo pagado: un
 * gasto que pagó el otro no puede ser un gasto personal propio (G-06, quien
 * pagó es lo declarado).
 */

import type { SharedExpense, Slot } from './types';

export function canMoveToPersonal(expense: SharedExpense, mySlot: Slot): boolean {
  return expense.createdBySlot === mySlot && expense.payerSlot === mySlot;
}
