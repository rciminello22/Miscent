/**
 * 2D · la mini barra de un mes de la puerta de Próximos meses. TS puro.
 *
 * El tope rayado del exceso va A ESCALA, como el tramo de más del radar (1A):
 * el cuerpo y el tope comparten el mismo "px por peso" de la puerta, y el tope
 * nunca mide menos que el mínimo, para que se vea que algo se pasa. La cifra
 * exacta no la dice la barra: va a la derecha de la puerta.
 */

/** El tope rayado nunca mide menos que esto, en px. */
export const MINI_BAR_MIN_CAP = 3;
/** Una barra con algo comprometido (o sin nada) nunca mide menos que esto, en px. */
export const MINI_BAR_MIN_BODY = 3;

export type MiniBarSegments = {
  /** Alto del cuerpo lleno, en px. */
  body: number;
  /** Alto del tope rayado que se suma arriba del cuerpo, en px. 0 si no hay exceso. */
  cap: number;
};

/**
 * @param input.committed El comprometido del mes (incluye lo que se pasa).
 * @param input.excess Cuánto supera a los ingresos previstos; 0 si no los supera.
 * @param input.maxCommitted El mayor comprometido de la serie: la referencia de escala.
 * @param height El alto que mide el mayor, en px.
 */
export function miniBarSegments(
  input: { committed: number; excess: number; maxCommitted: number },
  height: number,
): MiniBarSegments {
  const { committed, maxCommitted } = input;
  const excess = Math.min(Math.max(input.excess, 0), Math.max(committed, 0));
  const pxPerPeso = maxCommitted > 0 ? height / maxCommitted : 0;

  const cap = excess > 0 ? Math.max(MINI_BAR_MIN_CAP, excess * pxPerPeso) : 0;
  const body = Math.max(MINI_BAR_MIN_BODY, (committed - excess) * pxPerPeso);

  return { body, cap };
}
