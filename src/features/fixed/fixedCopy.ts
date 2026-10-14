/**
 * §21 · K3 · el texto de autoría de un fijo compartido. TS puro: se testea en
 * node. Mismas palabras que en el detalle de un gasto compartido.
 */

import type { Recurrence, Slot } from '@domain/types';

export function fixedAuthorLine(recurrence: Recurrence, mySlot: Slot, otherName: string): string {
  const who = (slot: Slot) => (slot === mySlot ? 'vos' : otherName);
  const parts: string[] = [];

  // Un fijo de antes de guardar quién lo cargó: no se inventa.
  if (recurrence.createdBySlot != null) {
    parts.push(recurrence.createdBySlot === mySlot ? 'Lo cargaste vos' : `Lo cargó ${otherName}`);
    if (recurrence.updatedBySlot != null && recurrence.updatedBySlot !== recurrence.createdBySlot) {
      parts.push(`lo editó ${who(recurrence.updatedBySlot)}`);
    }
  }

  // G-06 · quién paga es lo declarado.
  if (recurrence.payerSlot != null) {
    const pays = recurrence.payerSlot === mySlot ? 'pagás vos' : `paga ${otherName}`;
    parts.push(parts.length === 0 ? pays.charAt(0).toUpperCase() + pays.slice(1) : pays);
  }

  return parts.join(' · ');
}
