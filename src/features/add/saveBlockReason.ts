import type { Pesos } from '@domain/money';
import type { Category } from '@domain/types';
import { installmentCountIssue } from './installmentCount';

/**
 * UX-16 · por qué Guardar está deshabilitado. TS puro.
 *
 * El botón baja a 0,45 de opacidad y nada más: quien no ve la categoría
 * pendiente (la grilla es larga) no entiende por qué no avanza. Esta función
 * es la única que decide las dos cosas, así el botón y el motivo no pueden
 * contradecirse.
 */

export type SaveFormState = {
  amount: Pesos;
  category: Category | null;
  /** La cantidad elegida en "En cuotas"; `null` si no hay cuotas. */
  installmentCount: number | null;
  /** Hay un espacio elegido como destino pero todavía no cargó. */
  destinationLoading: boolean;
};

export function canSaveForm(form: SaveFormState): boolean {
  return (
    form.amount > 0 &&
    form.category != null &&
    installmentCountIssue(form.installmentCount) == null &&
    !form.destinationLoading
  );
}

/**
 * Lo primero que falta, en pocas palabras. `null` si se puede guardar o si el
 * formulario está recién abierto: un formulario vacío no necesita retar a
 * nadie, alcanza con que el botón esté apagado (§17).
 */
export function saveBlockReason(form: SaveFormState): string | null {
  const started = form.amount > 0 || form.category != null;
  if (!started) return null;

  if (form.amount <= 0) return 'Ingresá un monto';
  if (form.category == null) return 'Elegí una categoría';
  if (installmentCountIssue(form.installmentCount) != null) return 'Revisá la cantidad de cuotas';
  if (form.destinationLoading) return 'Cargando el espacio';
  return null;
}
