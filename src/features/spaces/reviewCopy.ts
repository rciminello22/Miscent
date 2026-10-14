/**
 * Opción B · el texto de "para revisar". TS puro: se testea en node.
 *
 * Es neutro a propósito (§39, "la app como árbitro de la pareja"): dice quién
 * lo cargó, no si está bien o mal. Revisar no es aprobar.
 */

import type { DeletedRecord, Slot } from '@domain/types';

export function reviewTag(otherName: string): string {
  return `Lo cargó ${otherName} · para revisar`;
}

/** En el espacio y, sutil, en Inicio. */
export function toReviewLine(count: number): string {
  return count === 1 ? '1 cosa para revisar' : `${count} cosas para revisar`;
}

export function markAllLabel(count: number): string {
  return count === 1 ? 'Está bien' : 'Están bien';
}

/** Lo que eliminó el otro: la misma marca, con el mismo tono neutro. */
export function deletedTag(otherName: string): string {
  return `Lo eliminó ${otherName} · para revisar`;
}

/**
 * Qué era lo que se eliminó, en las palabras con que se veía en el espacio.
 * `categoryLabel` se inyecta: el catálogo de categorías trae íconos nativos.
 */
export function deletedLabel(
  item: DeletedRecord,
  context: { mySlot: Slot; otherName: string; categoryLabel: (category: string) => string },
): string {
  if (item.kind === 'payment') {
    return item.fromSlot === context.mySlot
      ? `Le pagaste a ${context.otherName}`
      : `${context.otherName} te pagó`;
  }
  const name = item.description ?? (item.category != null ? context.categoryLabel(item.category) : '');
  return item.kind === 'recurrence' ? `Fijo · ${name}` : name;
}
