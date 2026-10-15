import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type { Category, InstallmentPlan, Split } from '@domain/types';

/**
 * ¿Se puede cambiar la fecha de este gasto ya cargado?
 *
 * Un gasto de un solo pago, sí: lo único que se guarda es la fecha y todo lo
 * demás (mes de la tarjeta, saldo del espacio, radar) se calcula en memoria
 * desde ella (X-01, §7.4).
 *
 * Una compra en cuotas, no: el plan guarda el mes de la primera cuota y el
 * día de impacto, que salen de la fecha Y de la tarjeta de quien pagó (F2).
 * Mover la fecha obligaría a recalcularlos, y en un gasto compartido quien
 * edita puede ser el otro miembro, que no ve esa tarjeta (PR-02): pisaría el
 * plan de quien pagó con uno calculado sin ella. Para corregirla se elimina
 * ("Fue un error") y se vuelve a cargar.
 */
export type DateEditability = { editable: true } | { editable: false; reason: string };

export function dateEditability(original: {
  installments: InstallmentPlan | null;
}): DateEditability {
  if (original.installments == null) return { editable: true };
  return {
    editable: false,
    reason: 'La fecha de una compra en cuotas no se cambia: de ella salen los meses de las cuotas.',
  };
}

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
