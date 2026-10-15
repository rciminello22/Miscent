/**
 * UX-01 · los ingresos fijos que se ven en "Tus ingresos".
 *
 * TS puro: se testea en node. Perfil cuenta con esta misma función, así que el
 * número de la fila y la lista que abre no pueden discrepar.
 */

import type { Month } from '@domain/calendar';
import type { Recurrence } from '@domain/types';

/**
 * Los ingresos recurrentes personales que siguen vigentes, ordenados por día de
 * cobro (a igual día, el de mayor monto primero).
 *
 * Los que terminaron antes del mes en curso (F-03 "Dejar de pagarlo desde…")
 * ya no cuentan en el radar y no se listan. Los que empiezan más adelante sí:
 * ya están cargados y hay que poder corregirlos. Un ingreso es siempre personal
 * (§17 campo 1), pero `spaceId` se mira igual: el espacio no es de esta lista.
 */
export function selectFixedIncomes(
  recurrences: readonly Recurrence[],
  currentMonth: Month,
): Recurrence[] {
  return recurrences
    .filter(
      (recurrence) =>
        recurrence.kind === 'income' &&
        recurrence.spaceId == null &&
        (recurrence.endMonth == null || recurrence.endMonth >= currentMonth),
    )
    .sort(
      (a, b) =>
        a.dayOfMonth - b.dayOfMonth || b.amount - a.amount || (a.id < b.id ? -1 : 1),
    );
}
