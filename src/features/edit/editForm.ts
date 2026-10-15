import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type { Category, Split } from '@domain/types';

/**
 * La edición de un gasto ya cargado (UX-18). TS puro.
 *
 * `EditFormValues` es lo que el formulario de edición tiene en pantalla. Los
 * campos `payerIsMe` y `split` existen solo en un gasto compartido.
 */
export type EditFormValues = {
  amount: Pesos;
  date: IsoDate;
  category: Category | null;
  paymentMethodId: string | null;
  installmentCount: number | null;
  description: string;
  payerIsMe?: boolean;
  split?: Split;
};

function sameSplit(a: Split | undefined, b: Split | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a.mode === 'even' || b.mode === 'even') return a.mode === b.mode;
  return a.shareSlot1 === b.shareSlot1 && a.shareSlot2 === b.shareSlot2;
}

/**
 * ¿Hay algo escrito que no se guardó? Decide si "Cancelar" pregunta antes de
 * descartar. La descripción se compara sin los espacios de los costados y
 * "sin descripción" es lo mismo que vacía, como al guardar.
 */
export function hasUnsavedChanges(initial: EditFormValues, current: EditFormValues): boolean {
  return (
    initial.amount !== current.amount ||
    initial.date !== current.date ||
    initial.category !== current.category ||
    initial.paymentMethodId !== current.paymentMethodId ||
    initial.installmentCount !== current.installmentCount ||
    initial.description.trim() !== current.description.trim() ||
    initial.payerIsMe !== current.payerIsMe ||
    !sameSplit(initial.split, current.split)
  );
}
