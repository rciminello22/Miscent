import { describe, it, expect } from 'vitest';
import { LINK_HIT_SLOP, MIN_TARGET, hitSlopFor } from './touch';

/**
 * UX-12 · todo lo tocable mide al menos 44×44pt EFECTIVOS. Cuando el dibujo es
 * más chico, el área de toque se agranda con `hitSlop` sin mover el layout.
 */

function effective(size: number, slop: number): number {
  return size + slop * 2;
}

describe('UX-12 · hitSlopFor', () => {
  it('un botón de ícono de 32 llega a 44 con 6 de cada lado', () => {
    const slop = hitSlopFor(32, 32);
    expect(slop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
  });

  it('un círculo de 36 llega a 44 con 4 de cada lado', () => {
    expect(hitSlopFor(36, 36)).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });

  it('lo que ya mide 44 o más no suma nada', () => {
    expect(hitSlopFor(44, 52)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(hitSlopFor(60, 46)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('cada eje se calcula por separado: un chip de 38 de alto solo crece en vertical', () => {
    expect(hitSlopFor(120, 38)).toEqual({ top: 3, bottom: 3, left: 0, right: 0 });
  });

  it('redondea hacia arriba para no quedarse corto con medidas impares', () => {
    const slop = hitSlopFor(29, 29);
    expect(effective(29, slop.left)).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(effective(29, slop.top)).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('cualquier tamaño de 1 a 60 termina con un área efectiva de al menos 44', () => {
    for (let size = 1; size <= 60; size += 1) {
      const slop = hitSlopFor(size, size);
      expect(effective(size, slop.left)).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(effective(size, slop.top)).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });
});

describe('UX-12 · LINK_HIT_SLOP', () => {
  it('un link de texto de 20pt de alto llega a 44 con 12 de cada lado', () => {
    expect(LINK_HIT_SLOP).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
    expect(effective(20, LINK_HIT_SLOP.top)).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});
