// TEMPORAL: variante B en prueba. Se borra junto con movementsVariant.ts.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/features/shared/useRememberedFlag', () => ({ useRememberedFlag: vi.fn() }));

import { variantFromFlag, variantSwitchLabel } from '../movementsVariant';

describe('movementsVariant · el interruptor temporal de las dos variantes', () => {
  it('apagada es la A; prendida, la B', () => {
    expect(variantFromFlag(false)).toBe('A');
    expect(variantFromFlag(true)).toBe('B');
  });

  it('mientras se lee la marca no se elige ninguna: no parpadea la equivocada', () => {
    expect(variantFromFlag(null)).toBeNull();
  });

  it('el interruptor dice cuál está activa', () => {
    expect(variantSwitchLabel('A')).toBe('Movimientos: variante A');
    expect(variantSwitchLabel('B')).toBe('Movimientos: variante B');
  });
});
