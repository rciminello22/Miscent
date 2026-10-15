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
  return card.closingDay != null && card.dueDay != null
    ? `Cierra el ${card.closingDay}, vence el ${card.dueDay}`
    : 'Fechas aproximadas';
}
