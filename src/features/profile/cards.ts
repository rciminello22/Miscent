import type { PaymentMethod } from '@domain/types';

/**
 * UX-21 · las tarjetas de crédito de Perfil > Tarjetas. TS puro: la lista y el
 * número de la fila de Perfil salen de esta misma función.
 */
export function selectCards(methods: readonly PaymentMethod[]): PaymentMethod[] {
  return methods
    .filter((method) => method.kind === 'card')
    .sort((a, b) => a.name.localeCompare(b.name, 'es') || (a.id < b.id ? -1 : 1));
}

/**
 * T-02 · lo que se sabe de la tarjeta. Con algún día en "No sé", T-05 aproxima
 * y la app lo dice: nunca se inventa un día.
 */
export function cardScheduleLine(card: PaymentMethod): string {
  if (card.closingDay == null || card.dueDay == null) return 'Fechas aproximadas';

  // T-02 · un día de "Más o menos" va con "~", y la línea lo dice una vez.
  const closing = `${card.closingApprox ? '~' : ''}${card.closingDay}`;
  const due = `${card.dueApprox ? '~' : ''}${card.dueDay}`;
  const line = `Cierra el ${closing}, vence el ${due}`;
  return card.closingApprox || card.dueApprox ? `${line} · aprox.` : line;
}
