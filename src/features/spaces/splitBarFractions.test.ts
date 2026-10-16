import { describe, it, expect } from 'vitest';
import { splitBarFractions } from './splitBarFractions';

/**
 * El reparto como una barra de dos tramos. La barra es una forma, nunca un
 * número: P3 prohíbe los porcentajes en la interfaz, así que acá solo salen
 * fracciones para dibujar el ancho.
 */
describe('splitBarFractions', () => {
  it('50/50: cada tramo ocupa la mitad', () => {
    expect(splitBarFractions(50_000, 50_000)).toEqual({ mine: 0.5, other: 0.5 });
  });

  it('un reparto desparejo se dibuja proporcional', () => {
    expect(splitBarFractions(60_000, 40_000)).toEqual({ mine: 0.6, other: 0.4 });
  });

  it('C-04 · una parte en $0: el otro tramo ocupa todo', () => {
    expect(splitBarFractions(0, 30_000)).toEqual({ mine: 0, other: 1 });
    expect(splitBarFractions(30_000, 0)).toEqual({ mine: 1, other: 0 });
  });

  it('sin monto no hay nada que repartir: la barra queda vacía', () => {
    expect(splitBarFractions(0, 0)).toEqual({ mine: 0, other: 0 });
  });

  it('una parte negativa no existe: se trata como cero', () => {
    expect(splitBarFractions(-5, 10)).toEqual({ mine: 0, other: 1 });
  });
});
