/**
 * UX-01 · los ingresos fijos que se ven en "Tus ingresos".
 *
 * TS puro: se testea en node. Perfil cuenta con esta misma función, así que el
 * número de la fila y la lista que abre no pueden discrepar.
 */

import type { Month } from '@domain/calendar';
import type { Recurrence } from '@domain/types';
import { selectPersonalFixed } from './fixedSelection';

/**
 * Los ingresos recurrentes personales que siguen vigentes, ordenados por día de
 * cobro (a igual día, el de mayor monto primero). Un ingreso es siempre
 * personal (§17 campo 1).
 */
export function selectFixedIncomes(
  recurrences: readonly Recurrence[],
  currentMonth: Month,
): Recurrence[] {
  return selectPersonalFixed('income', recurrences, currentMonth);
}
