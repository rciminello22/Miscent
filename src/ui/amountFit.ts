/**
 * Cifras que se ajustan (Montos · 11).
 *
 * Las cifras grandes (el N1 de Inicio, de Futuro y del espacio, el detalle de
 * un gasto) entran en UNA línea y se achican solas hasta un mínimo legible; no
 * se abrevian nunca ("$1,2 M" cambia la forma de leer la plata). Las chicas no
 * se ajustan: en las filas cede el texto de la izquierda, no el monto.
 */

/** El tamaño más chico al que baja una cifra grande, en pt. */
export const FIT_MIN_FONT_SIZE = 20;

const FIT_VARIANTS: ReadonlySet<string> = new Set(['display', 'title']);

export type FitProps = {
  numberOfLines: 1;
  adjustsFontSizeToFit: true;
  /** Proporción del tamaño original: `FIT_MIN_FONT_SIZE / fontSize`. */
  minimumFontScale: number;
};

/** Las props de `Text` que hacen que la cifra se achique, o `null` si no corresponde. */
export function fitPropsFor(variant: string, fontSize: number): FitProps | null {
  if (!FIT_VARIANTS.has(variant)) return null;
  return {
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontScale: Math.min(1, FIT_MIN_FONT_SIZE / fontSize),
  };
}
