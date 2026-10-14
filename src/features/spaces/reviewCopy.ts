/**
 * Opción B · el texto de "para revisar". TS puro: se testea en node.
 *
 * Es neutro a propósito (§39, "la app como árbitro de la pareja"): dice quién
 * lo cargó, no si está bien o mal. Revisar no es aprobar.
 */

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
