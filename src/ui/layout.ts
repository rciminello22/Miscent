/**
 * Medidas de la zona de abajo de las pantallas. TS puro: se testea en node.
 *
 * La barra de pestañas está EN el flujo (no es absoluta) y su alto ya incluye
 * el inset inferior: 49 + inset. La escena termina arriba de la barra, así que
 * dentro de una pestaña el inset NO se vuelve a sumar. Antes se sumaba, y
 * además se reservaban 120 a 140pt "para el botón Agregar" aun donde ese botón
 * no está (dentro de un espacio): 84 a 130pt de blanco al final.
 */

/** Alto de la barra de pestañas SIN el inset (React Navigation: 49 en iOS). */
export const TAB_BAR_BASE = 49;
/** El botón flotante "Agregar". */
export const FAB_HEIGHT = 52;
/** Aire entre la barra de pestañas y el botón flotante. */
export const FAB_GAP = 16;
/** El colchón mínimo al final de cualquier pantalla que scrollea. */
export const CONTENT_BOTTOM = 24;

/**
 * El padding de abajo del contenido que scrollea.
 *
 *   tabs · la pantalla vive dentro de la barra de pestañas (que ya lleva el inset)
 *   fab  · el botón Agregar está a la vista sobre esa pantalla
 */
export function bottomPadding(args: { insetBottom: number; tabs: boolean; fab: boolean }): number {
  if (!args.tabs) return args.insetBottom + CONTENT_BOTTOM;
  return args.fab ? FAB_GAP + FAB_HEIGHT + CONTENT_BOTTOM : CONTENT_BOTTOM;
}

/** Desde el borde de abajo del teléfono hasta el pie del botón Agregar. */
export function fabBottom(insetBottom: number): number {
  return insetBottom + TAB_BAR_BASE + FAB_GAP;
}
