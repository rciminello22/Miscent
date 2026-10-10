import { describe, it, expect } from 'vitest';
import { calculateSharedBalance, calculateSpaceMonth } from '../shared-balance';
import { MARTINA, RENZO, sharedExpense, sharedRecurrence, spaceFacts } from './fixtures';

/**
 * El mes del espacio cuenta HASTA HOY (decisión del 10/10).
 *
 * S-04 · "Mes del espacio: ocurrencias que ocurren en ese mes según S-02". Lo
 * que todavía no llegó a su fecha todavía no ocurrió. Antes, el alquiler del
 * día 28 ya sumaba en las barras el día 15 mientras el saldo (S-02) recién lo
 * contaba el 28: las dos cifras de la misma pantalla no cerraban.
 */
const HOY = '2026-10-15';

const casa = spaceFacts({
  expenses: [
    sharedExpense({ amount: 100_000, date: '2026-10-08', payerSlot: RENZO, description: 'Super' }),
  ],
  recurrences: [
    sharedRecurrence({
      id: 'alquiler',
      amount: 500_000,
      dayOfMonth: 28,
      startMonth: '2026-10',
      payerSlot: RENZO,
      category: 'alquiler',
    }),
  ],
});

describe('el mes del espacio · hasta hoy', () => {
  it('las barras cuentan solo lo que ya pasó: el alquiler del 28 todavía no', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', HOY);
    expect(mes.total).toBe(100_000);
    expect(mes.viewer).toEqual({ put: 100_000, share: 50_000 });
    expect(mes.other).toMatchObject({ put: 0, share: 50_000 });
  });

  it('"pusiste de más" cierra con el saldo de la misma pantalla', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', HOY);
    expect(mes.viewerPutExtra).toBe(calculateSharedBalance(casa, RENZO, HOY).amount);
  });

  it('lo que falta del mes va aparte, como "se vienen"', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', HOY);
    expect(mes.upcoming).toEqual([
      { label: 'alquiler', amount: 500_000, date: '2026-10-28', payerSlot: RENZO },
    ]);
  });

  it('el día del vencimiento ya cuenta (S-02: "en su día del mes")', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', '2026-10-28');
    expect(mes.total).toBe(600_000);
    expect(mes.upcoming).toEqual([]);
  });

  it('un mes que ya terminó se cuenta entero y no tiene "se vienen"', () => {
    const mes = calculateSpaceMonth(casa, MARTINA, '2026-10', '2026-11-03');
    expect(mes.total).toBe(600_000);
    expect(mes.upcoming).toEqual([]);
  });
});
