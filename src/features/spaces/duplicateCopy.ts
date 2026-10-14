/**
 * Should 2 · el texto del aviso de posible duplicado. TS puro: se testea en
 * node. Neutro (§39): dice qué hay cargado, no acusa a nadie de duplicar.
 */

import type { SharedExpense, Slot } from '@domain/types';
import { formatDayMonth, formatPesos } from '@/lib/format';

export function duplicateMessage(
  expense: SharedExpense,
  context: { mySlot: Slot; otherName: string; categoryLabel: (category: string) => string },
): string {
  const what = expense.description ?? context.categoryLabel(expense.category);
  const loaded =
    expense.createdBySlot === context.mySlot ? 'Ya cargaste' : `${context.otherName} ya cargó`;
  return `${loaded} ${what} por ${formatPesos(expense.amount)} el ${formatDayMonth(expense.date)}. ¿Es otro gasto?`;
}
