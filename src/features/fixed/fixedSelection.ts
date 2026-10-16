import type { Month } from '@domain/calendar';
import type { Recurrence } from '@domain/types';

/**
 * Los recurrentes PERSONALES de un tipo que siguen vigentes, por día del mes
 * (a igual día, el de mayor monto primero). TS puro.
 *
 * Los que terminaron antes del mes en curso (F-03 "Dejar de pagarlo desde…") ya
 * no cuentan en el radar y no se listan. Los que empiezan más adelante sí: ya
 * están cargados y hay que poder corregirlos. `spaceId` se mira igual: los
 * fijos de un espacio no son de estas listas.
 */
export function selectPersonalFixed(
  kind: Recurrence['kind'],
  recurrences: readonly Recurrence[],
  currentMonth: Month,
): Recurrence[] {
  return recurrences
    .filter(
      (recurrence) =>
        recurrence.kind === kind &&
        recurrence.spaceId == null &&
        (recurrence.endMonth == null || recurrence.endMonth >= currentMonth),
    )
    .sort(
      (a, b) =>
        // Sin día ("No sé", solo un ingreso) va al final.
        (a.dayOfMonth ?? 32) - (b.dayOfMonth ?? 32) ||
        b.amount - a.amount ||
        (a.id < b.id ? -1 : 1),
    );
}
