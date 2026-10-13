/**
 * §13 O3 paso 4 · Q-06 · "cuotas del último resumen", en plural.
 *
 * Hasta el 12/10 se podía cargar UNA sola compra en cuotas por tarjeta: quien
 * tenía la heladera, el celular y las zapatillas en la Visa cargaba una y
 * perdía dos de su Futuro.
 */

import { describe, it, expect } from 'vitest';
import { emptyPurchase, purchasesToSave, type ExistingPurchase } from './existingPurchases';

const context = { lastStatementMonth: '2026-09', impactDay: 5 } as const;

function purchase(patch: Partial<ExistingPurchase>): ExistingPurchase {
  return { ...emptyPurchase('p'), ...patch };
}

describe('Q-06 · varias compras en cuotas por tarjeta', () => {
  it('cada compra completa genera las cuotas que le faltan, desde el mes siguiente al resumen', () => {
    const result = purchasesToSave(
      [
        purchase({ key: 'a', description: 'Heladera', installmentAmount: 50_000, paidCount: 3, totalCount: 6 }),
        purchase({ key: 'b', description: 'Celular', installmentAmount: 20_000, paidCount: 1, totalCount: 12 }),
      ],
      context,
    );

    expect(result).toEqual([
      {
        description: 'Heladera',
        remainingTotal: 150_000,
        plan: { count: 3, firstMonth: '2026-10', impactDay: 5, approximate: false },
      },
      {
        description: 'Celular',
        remainingTotal: 220_000,
        plan: { count: 11, firstMonth: '2026-10', impactDay: 5, approximate: false },
      },
    ]);
  });

  it('sin descripción se guarda como "Cuotas en curso"', () => {
    const [saved] = purchasesToSave(
      [purchase({ installmentAmount: 30_000, paidCount: 3, totalCount: 6, description: '  ' })],
      context,
    );
    expect(saved?.description).toBe('Cuotas en curso');
  });

  it('las que quedaron a medio completar no se guardan: no se inventa nada', () => {
    const result = purchasesToSave(
      [
        purchase({ installmentAmount: 30_000, paidCount: null, totalCount: 6 }),
        purchase({ installmentAmount: 0, paidCount: 1, totalCount: 6 }),
        purchase({ installmentAmount: 30_000, paidCount: 2, totalCount: null }),
      ],
      context,
    );
    expect(result).toEqual([]);
  });

  it('una compra ya terminada ("6 de 6") no genera nada', () => {
    const result = purchasesToSave(
      [purchase({ installmentAmount: 30_000, paidCount: 6, totalCount: 6 })],
      context,
    );
    expect(result).toEqual([]);
  });

  it('T-05 · sin día de vencimiento, las fechas son aproximadas', () => {
    const [saved] = purchasesToSave(
      [purchase({ installmentAmount: 30_000, paidCount: 3, totalCount: 6 })],
      { lastStatementMonth: '2026-09', impactDay: null },
    );
    expect(saved?.plan.approximate).toBe(true);
  });
});
