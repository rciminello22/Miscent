/**
 * SA-04 · §27 · después de una salida, los fijos compartidos se detienen y
 * quien queda decide sobre cada uno: "¿Lo seguís pagando vos?" → Pasarlo a
 * mis fijos / Terminarlo.
 *
 * Sin esta pregunta, el alquiler desaparecía del radar de quien quedaba de un
 * mes para el otro, sin aviso: su Comprometido bajaba aunque lo siguiera
 * pagando entero.
 */

import type { Month } from './calendar';
import type { Pesos } from './money';
import type { Category, Slot, SpaceFacts } from './types';

export type StoppedFixed = {
  recurrenceId: string;
  category: Category;
  description: string | null;
  /** El total: Caso 13, "pasa a sus fijos por $500.000". */
  amount: Pesos;
  /** El último mes en que fue compartido. */
  endMonth: Month;
  /** Quien salió, para la pregunta: "era compartido con Martina". */
  otherName: string;
};

export function pendingStoppedFixed(facts: SpaceFacts, mySlot: Slot): StoppedFixed[] {
  const me = facts.space.members.find((member) => member.slot === mySlot);
  const other = facts.space.members.find((member) => member.slot !== mySlot);
  // SA-02 · quien salió ya no ve el espacio: no decide nada.
  if (me?.status !== 'active' || other == null) return [];

  return facts.recurrences
    .filter(
      (recurrence) =>
        recurrence.spaceId != null &&
        recurrence.stoppedByDepartureOn != null &&
        recurrence.departureResolution == null &&
        recurrence.endMonth != null,
    )
    .map((recurrence) => ({
      recurrenceId: recurrence.id,
      category: recurrence.category,
      description: recurrence.description,
      amount: recurrence.amount,
      endMonth: recurrence.endMonth!,
      otherName: other.displayName,
    }));
}
