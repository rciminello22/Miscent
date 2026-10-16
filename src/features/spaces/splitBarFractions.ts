/**
 * El ancho de cada tramo de la barra del reparto. TS puro.
 *
 * La barra es una forma, nunca un número: P3 prohíbe los porcentajes en la
 * interfaz, así que acá solo salen fracciones para dibujar. Sin monto, los dos
 * tramos son 0 y la barra queda vacía.
 */
export function splitBarFractions(
  myShare: number,
  otherShare: number,
): { mine: number; other: number } {
  const mine = Math.max(myShare, 0);
  const other = Math.max(otherShare, 0);
  const total = mine + other;
  if (total === 0) return { mine: 0, other: 0 };
  return { mine: mine / total, other: other / total };
}
