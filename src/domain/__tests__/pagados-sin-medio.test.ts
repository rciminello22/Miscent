/**
 * §5 1º Should · §11 paso 4 · "Pagaste estos gastos de Casa. ¿Con qué?"
 *
 * Si Martina carga "Super · pagó Renzo", el gasto queda al contado (C-05) y
 * nunca entra al resumen estimado de la Visa de Renzo ni a sus Próximos
 * pagos. Acá se calcula qué gastos hay que preguntarle.
 */

import { describe, it, expect } from 'vitest';
import { paidByMeWithoutMethod } from '../paidByMe';
import { MARTINA, RENZO, membership, paidWith, sharedExpense, spaceFacts, visa } from './fixtures';

const HOY = '2026-10-14';

const superDeMartina = {
  ...sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-10', payerSlot: RENZO }),
  createdBySlot: MARTINA,
};

describe('qué gastos se le preguntan a quien pagó', () => {
  it('Martina cargó "pagó Renzo" sin medio: se le pregunta a Renzo', () => {
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [superDeMartina] }), mySlot: RENZO }),
      HOY,
      { includeOwn: false },
    );

    expect(result.map((item) => item.expenseId)).toEqual(['super']);
    expect(result[0]).toMatchObject({ amount: 100_000, date: '2026-10-10', installmentCount: null });
  });

  it('una vez que tiene medio, ya no se pregunta (aunque sea efectivo)', () => {
    const result = paidByMeWithoutMethod(
      membership({
        facts: spaceFacts({ expenses: [superDeMartina] }),
        mySlot: RENZO,
        paymentDetails: [paidWith('super', RENZO, 'efectivo')],
      }),
      HOY,
      { includeOwn: false },
    );
    expect(result).toEqual([]);
  });

  it('lo que pagó el otro no se le pregunta (C-05: el medio es de quien pagó)', () => {
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [superDeMartina] }), mySlot: MARTINA }),
      HOY,
      { includeOwn: false },
    );
    expect(result).toEqual([]);
  });

  it('lo que cargó él mismo sin medio fue su elección: no se pregunta en el espacio', () => {
    const propio = { ...superDeMartina, createdBySlot: RENZO };
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [propio] }), mySlot: RENZO }),
      HOY,
      { includeOwn: false },
    );
    expect(result).toEqual([]);
  });

  it('§11 paso 4 · al activar la cuenta sí: como invitada no podía elegir medio', () => {
    const propio = { ...superDeMartina, createdBySlot: RENZO };
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [propio] }), mySlot: RENZO }),
      HOY,
      { includeOwn: true },
    );
    expect(result.map((item) => item.expenseId)).toEqual(['super']);
  });
});

describe('solo lo que todavía puede cambiar algo', () => {
  it('un gasto en un pago de hace más de dos meses ya pasó por su resumen: no se pregunta', () => {
    const viejo = { ...superDeMartina, date: '2026-07-20' };
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [viejo] }), mySlot: RENZO }),
      HOY,
      { includeOwn: false },
    );
    expect(result).toEqual([]);
  });

  it('una compra en cuotas vieja, con cuotas por delante, sí', () => {
    const heladera = {
      ...sharedExpense({
        id: 'heladera',
        amount: 600_000,
        date: '2026-05-20',
        payerSlot: RENZO,
        installments: { count: 12, card: visa },
      }),
      createdBySlot: MARTINA,
    };
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [heladera] }), mySlot: RENZO }),
      HOY,
      { includeOwn: false },
    );
    expect(result[0]).toMatchObject({ expenseId: 'heladera', installmentCount: 12 });
  });

  it('una compra en cuotas ya terminada, no', () => {
    const terminada = {
      ...sharedExpense({
        id: 'tele',
        amount: 300_000,
        date: '2026-01-20',
        payerSlot: RENZO,
        installments: { count: 3, card: visa },
      }),
      createdBySlot: MARTINA,
    };
    const result = paidByMeWithoutMethod(
      membership({ facts: spaceFacts({ expenses: [terminada] }), mySlot: RENZO }),
      HOY,
      { includeOwn: false },
    );
    expect(result).toEqual([]);
  });

  it('de un espacio del que salió, nada: ya no lo ve (SA-02)', () => {
    const result = paidByMeWithoutMethod(
      membership({
        facts: spaceFacts({ expenses: [superDeMartina] }),
        mySlot: RENZO,
        leftOn: '2026-10-12',
      }),
      HOY,
      { includeOwn: false },
    );
    expect(result).toEqual([]);
  });
});
