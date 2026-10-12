/**
 * §11 paso 3 · §13 O3 pasos 4 y 5 · CA-09 · prevención de duplicados.
 *
 * Al activar la cuenta personal, lo que ya está en un espacio se muestra para
 * que no se cargue de nuevo como personal: si no, el radar lo cuenta dos veces
 * (su parte del espacio por K9, y además el fijo personal).
 *
 * Personajes del Caso 10: Martina activa su cuenta con "Alquiler" ($500.000,
 * 50/50) y la heladera (6 cuotas de $100.000, Visa de Renzo) ya en Casa.
 */

import { describe, it, expect } from 'vitest';
import { alreadyInSpaces } from '../duplicates';
import {
  MARTINA,
  RENZO,
  casa,
  membership,
  override,
  sharedExpense,
  sharedRecurrence,
  spaceFacts,
  visa,
} from './fixtures';

const HOY = '2026-10-07';

const alquiler = sharedRecurrence({
  id: 'alquiler',
  amount: 500_000,
  dayOfMonth: 10,
  startMonth: '2026-08',
  payerSlot: RENZO,
});

const heladera = sharedExpense({
  id: 'heladera',
  amount: 600_000,
  date: '2026-10-20',
  payerSlot: RENZO,
  category: 'hogar',
  description: 'Heladera',
  installments: { count: 6, card: visa },
});

describe('CA-09 · los fijos que ya están en sus espacios', () => {
  it('Caso 10 · "Alquiler" aparece como "Ya en Casa · tu parte $250.000"', () => {
    const casaFacts = spaceFacts({ recurrences: [alquiler] });

    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: MARTINA })], HOY);

    expect(result.fixed).toEqual([
      {
        recurrenceId: 'alquiler',
        spaceId: 'casa',
        spaceName: 'Casa',
        category: 'alquiler',
        myShare: 250_000,
        nextDate: '2026-10-10',
      },
    ]);
  });

  it('tu parte es la de la PRÓXIMA ocurrencia: si la de este mes ya pasó, vale el ajuste del mes que viene', () => {
    const casaFacts = spaceFacts({
      recurrences: [alquiler],
      overrides: [override('alquiler', '2026-11', 600_000)],
    });

    const result = alreadyInSpaces(
      [membership({ facts: casaFacts, mySlot: MARTINA })],
      '2026-10-10', // el día del alquiler: Q-05 · ya pasó
    );

    expect(result.fixed[0]).toMatchObject({ myShare: 300_000, nextDate: '2026-11-10' });
  });

  it('reparto personalizado: la parte de su lugar, no la mitad', () => {
    const custom = sharedRecurrence({
      id: 'expensas',
      amount: 100_000,
      dayOfMonth: 15,
      startMonth: '2026-10',
      payerSlot: MARTINA,
      category: 'expensas',
      split: { mode: 'custom', shareSlot1: 70_000, shareSlot2: 30_000 },
    });
    const casaFacts = spaceFacts({ recurrences: [custom] });

    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: MARTINA })], HOY);

    expect(result.fixed[0]).toMatchObject({ category: 'expensas', myShare: 30_000 });
  });

  it('un fijo que ya terminó no aparece: no hay nada que duplicar', () => {
    const terminado = sharedRecurrence({
      amount: 50_000,
      dayOfMonth: 5,
      startMonth: '2026-01',
      endMonth: '2026-10', // el 5/10 ya pasó: no queda ninguna ocurrencia
      payerSlot: RENZO,
      category: 'internet',
    });
    const casaFacts = spaceFacts({ recurrences: [terminado] });

    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: MARTINA })], HOY);

    expect(result.fixed).toEqual([]);
  });

  it('un fijo que empieza más adelante sí aparece, con su primera fecha', () => {
    const futuro = sharedRecurrence({
      amount: 40_000,
      dayOfMonth: 1,
      startMonth: '2027-03',
      payerSlot: RENZO,
      category: 'gimnasio',
    });
    const casaFacts = spaceFacts({ recurrences: [futuro] });

    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: MARTINA })], HOY);

    expect(result.fixed[0]).toMatchObject({ myShare: 20_000, nextDate: '2027-03-01' });
  });

  it('SA-04 · de un espacio del que salió, los fijos ya no son suyos', () => {
    const casaFacts = spaceFacts({ recurrences: [alquiler] });

    const result = alreadyInSpaces(
      [membership({ facts: casaFacts, mySlot: MARTINA, leftOn: '2026-09-30' })],
      HOY,
    );

    expect(result.fixed).toEqual([]);
  });

  it('nombra el espacio de cada fijo cuando tiene varios', () => {
    const viaje = spaceFacts({
      space: casa({ id: 'viaje', name: 'Viaje' }),
      recurrences: [{ ...alquiler, id: 'cochera', spaceId: 'viaje', category: 'otros', amount: 20_000 }],
    });

    const result = alreadyInSpaces(
      [
        membership({ facts: spaceFacts({ recurrences: [alquiler] }), mySlot: MARTINA }),
        membership({ facts: viaje, mySlot: MARTINA }),
      ],
      HOY,
    );

    expect(result.fixed.map((item) => [item.spaceName, item.category])).toEqual([
      ['Casa', 'alquiler'],
      ['Viaje', 'otros'],
    ]);
  });
});

describe('§13 O3 paso 4 · las cuotas compartidas que ya existen', () => {
  it('solo las que pagó ella: son las únicas que figuran en el resumen de SU tarjeta', () => {
    const casaFacts = spaceFacts({ expenses: [heladera] });

    const martina = alreadyInSpaces([membership({ facts: casaFacts, mySlot: MARTINA })], HOY);
    const renzo = alreadyInSpaces([membership({ facts: casaFacts, mySlot: RENZO })], HOY);

    expect(martina.installments).toEqual([]);
    expect(renzo.installments).toEqual([
      {
        expenseId: 'heladera',
        spaceId: 'casa',
        spaceName: 'Casa',
        description: 'Heladera',
        category: 'hogar',
        installmentAmount: 100_000,
        myShare: 50_000,
        remaining: 6,
        count: 6,
      },
    ]);
  });

  it('cuenta solo las cuotas que todavía no pasaron', () => {
    const casaFacts = spaceFacts({ expenses: [heladera] });

    // Cuotas el 5/11, 5/12, 5/1, 5/2, 5/3, 5/4. Al 5/1 ya pasaron tres.
    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: RENZO })], '2027-01-05');

    expect(result.installments[0]).toMatchObject({ remaining: 3, count: 6 });
  });

  it('una compra en cuotas que ya terminó no aparece', () => {
    const casaFacts = spaceFacts({ expenses: [heladera] });

    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: RENZO })], '2027-04-05');

    expect(result.installments).toEqual([]);
  });

  it('un gasto en un pago no es una cuota en curso', () => {
    const casaFacts = spaceFacts({
      expenses: [sharedExpense({ amount: 80_000, date: '2026-10-02', payerSlot: RENZO })],
    });

    const result = alreadyInSpaces([membership({ facts: casaFacts, mySlot: RENZO })], HOY);

    expect(result.installments).toEqual([]);
  });
});

describe('sin espacios', () => {
  it('quien se registra por su cuenta (O1) no tiene nada que duplicar', () => {
    expect(alreadyInSpaces([], HOY)).toEqual({ fixed: [], installments: [] });
  });
});
