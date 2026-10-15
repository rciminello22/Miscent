/**
 * UX-12 · áreas de toque. TS puro: se testea en node.
 *
 * Todo lo tocable mide al menos 44×44pt EFECTIVOS (HIG de iOS). Cuando el dibujo
 * es más chico (un ícono de 32, un chip de 38, un link de texto de 20), el área
 * de toque se agranda con `hitSlop`: el layout no se mueve y el dibujo no cambia.
 */

/** El mínimo de iOS. */
export const MIN_TARGET = 44;

export type Slop = { top: number; bottom: number; left: number; right: number };

function slopFor(size: number, min: number): number {
  return Math.max(0, Math.ceil((min - size) / 2));
}

/** El `hitSlop` que lleva un elemento de `width × height` a `min × min` efectivos. */
export function hitSlopFor(width: number, height: number, min: number = MIN_TARGET): Slop {
  const horizontal = slopFor(width, min);
  const vertical = slopFor(height, min);
  return { top: vertical, bottom: vertical, left: horizontal, right: horizontal };
}

/**
 * Un link de texto mide el alto de su línea (20pt con `small`): 12 de cada lado
 * lo llevan a 44. El ancho lo da el texto.
 */
export const LINK_HIT_SLOP: Slop = { top: 12, bottom: 12, left: 12, right: 12 };
