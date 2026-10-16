import { describe, it, expect } from 'vitest';
import { miniBarSegments, MINI_BAR_MIN_CAP } from './miniBars';

/**
 * 2D · la mini barra de un mes. El tope rayado del exceso va A ESCALA: el mismo
 * "pesos por px" que el resto de las barras de la puerta (y el lenguaje del
 * recipiente de 1A), con un mínimo para que se vea.
 */

describe('miniBarSegments', () => {
  it('sin exceso la barra es un solo cuerpo, proporcional al mayor, y no hay tope', () => {
    const segments = miniBarSegments({ committed: 500_000, excess: 0, maxCommitted: 1_000_000 }, 26);

    expect(segments).toEqual({ body: 13, cap: 0 });
  });

  it('el mayor llena el alto', () => {
    expect(
      miniBarSegments({ committed: 800_000, excess: 0, maxCommitted: 800_000 }, 26).body,
    ).toBeCloseTo(26, 5);
  });

  it('con exceso, el tope mide lo que pesa el exceso en la misma escala', () => {
    // 260.000 de 1.000.000 en 100px son 26px de tope; el cuerpo es el resto.
    const segments = miniBarSegments(
      { committed: 1_000_000, excess: 260_000, maxCommitted: 1_000_000 },
      100,
    );

    expect(segments.cap).toBe(26);
    expect(segments.body).toBe(74);
  });

  it('un exceso chico no desaparece: el tope nunca mide menos que el mínimo', () => {
    // $35.000 sobre $1.235.000 en 26px serían menos de 1px.
    const segments = miniBarSegments(
      { committed: 1_235_000, excess: 35_000, maxCommitted: 1_235_000 },
      26,
    );

    expect(segments.cap).toBe(MINI_BAR_MIN_CAP);
    // El cuerpo conserva su escala: el tope se suma arriba, como el tramo de más del radar.
    expect(segments.body).toBeCloseTo(((1_235_000 - 35_000) / 1_235_000) * 26, 5);
  });

  it('un mes más bajo que el mayor queda más bajo, con exceso o sin él', () => {
    const low = miniBarSegments({ committed: 400_000, excess: 0, maxCommitted: 1_000_000 }, 100);
    const high = miniBarSegments({ committed: 1_000_000, excess: 0, maxCommitted: 1_000_000 }, 100);

    expect(low.body).toBeLessThan(high.body);
  });

  it('sin comprometido en ninguna parte, un cuerpo mínimo y nada más', () => {
    const segments = miniBarSegments({ committed: 0, excess: 0, maxCommitted: 0 }, 26);

    expect(segments.cap).toBe(0);
    expect(segments.body).toBeGreaterThan(0);
  });

  it('un exceso mayor que el comprometido no da un cuerpo negativo', () => {
    const segments = miniBarSegments({ committed: 100_000, excess: 150_000, maxCommitted: 100_000 }, 26);

    expect(segments.body).toBeGreaterThan(0);
  });
});
