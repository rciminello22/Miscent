/**
 * UX-21 · los gastos fijos que se ven en "Tus fijos". TS puro: Perfil cuenta
 * con esta misma función, así que el número de la fila y la lista que abre no
 * pueden discrepar.
 */

import type { Month } from '@domain/calendar';
import type { Recurrence } from '@domain/types';
import { selectPersonalFixed } from './fixedSelection';

export function selectFixedExpenses(
  recurrences: readonly Recurrence[],
  currentMonth: Month,
): Recurrence[] {
  return selectPersonalFixed('expense', recurrences, currentMonth);
}
