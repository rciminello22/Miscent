/**
 * Corregir los días de una tarjeta, lo que toca a un espacio (P2, C-05). Vive
 * acá porque es el único lugar donde se habla del saldo compartido.
 *
 * Una cuota compartida mueve el saldo en la fecha de cada cuota (P2): si la
 * fecha cambia, el saldo cambia en la fecha nueva. La otra persona ve las
 * fechas, nunca la tarjeta (C-05). Un gasto en 1 pago o un fijo no: su fecha en
 * el saldo no depende de la tarjeta (P19).
 */

import type { CardDaysChangeItem } from '@domain/cardDays';

export type SharedDatesNote = { title: string; detail: string };

/**
 * Una nota por persona. Va con el nombre y sin género: "Martina ve las fechas,
 * no la tarjeta", nunca "ella".
 */
export function sharedDatesNotes(items: readonly CardDaysChangeItem[]): SharedDatesNote[] {
  const names: string[] = [];

  for (const item of items) {
    if (item.kind !== 'installments' || item.spaceName == null) continue;
    const name = item.otherMemberName ?? 'La otra persona';
    if (!names.includes(name)) names.push(name);
  }

  return names.map((name) => ({
    title: `El saldo con ${name} cambia en la fecha nueva de cada cuota.`,
    detail: `${name} ve las fechas, no la tarjeta.`,
  }));
}
