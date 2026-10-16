import { describe, it, expect } from 'vitest';
import { pendingPill, pendingTotal } from './spaceListCopy';

/**
 * P23 · la lista de Compartidos muestra, en la tarjeta de cada espacio, una
 * pastilla con lo que está pendiente ("2 por revisar"). La cuenta suma las tres
 * cosas que el espacio junta en su puerta de Pendientes.
 */
describe('pendingTotal', () => {
  it('suma fijos detenidos, pagados por vos sin medio y lo que hay que revisar', () => {
    expect(pendingTotal({ stoppedFixed: 1, paidByOther: 2, toReview: 3 })).toBe(6);
  });

  it('sin nada pendiente es cero', () => {
    expect(pendingTotal({ stoppedFixed: 0, paidByOther: 0, toReview: 0 })).toBe(0);
  });
});

describe('pendingPill', () => {
  it('sin pendientes no hay pastilla: lo condicional no ocupa lugar', () => {
    expect(pendingPill(0)).toBeNull();
  });

  it('singular y plural', () => {
    expect(pendingPill(1)).toBe('1 por revisar');
    expect(pendingPill(2)).toBe('2 por revisar');
  });
});
