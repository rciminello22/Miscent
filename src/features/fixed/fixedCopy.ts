/**
 * §21 · K3 · el texto de autoría de un fijo compartido. TS puro: se testea en
 * node. Mismas palabras que en el detalle de un gasto compartido.
 */

import type { Recurrence, Slot } from '@domain/types';

/**
 * UX-01 · las palabras del detalle de un fijo. Un ingreso fijo se COBRA: con
 * "pagarlo" el sueldo se leería como un gasto.
 */
export function fixedWording(isIncome: boolean): {
  stopLabel: string;
  dayQuestion: string;
  stopQuestion: string;
  deleteTitle: string;
  deleteMessage: string;
} {
  const verb = isIncome ? 'cobrar' : 'pagar';
  const voseo = isIncome ? 'cobrás' : 'pagás';
  const stopLabel = isIncome ? 'Dejar de cobrarlo' : 'Dejar de pagarlo';

  return {
    stopLabel,
    dayQuestion: `¿Qué día lo ${voseo}?`,
    stopQuestion: `¿Cuál fue el último mes que lo ${voseo}?`,
    deleteTitle: isIncome ? '¿Eliminar este ingreso?' : '¿Eliminar este fijo?',
    deleteMessage: `Desaparece de todos los meses, también de los que ya pasaron. Si lo que querés es dejar de ${verb}lo desde ahora, usá “${stopLabel}”.`,
  };
}

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
