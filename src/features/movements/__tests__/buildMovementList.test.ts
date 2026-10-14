import { describe, it, expect } from 'vitest';
import { formatMonth, formatPesos } from '@/lib/format';
import {
  buildMovementList,
  filterMovements,
  spacesInMonth,
} from '../buildMovementList';
import {
  MARTINA,
  RENZO,
  debito,
  membership,
  memberPayment,
  movement,
  paidWith,
  personalFacts,
  sharedExpense,
  spaceFacts,
  visa,
} from '@domain/__tests__/fixtures';

const options = {
  month: '2026-10',
  monthName: (month: string) => formatMonth(month, '2026-10'),
  formatAmount: formatPesos,
};

describe('opción B · "para revisar" en Movimientos', () => {
  const delSuper = {
    ...sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-05', payerSlot: MARTINA }),
    createdBySlot: MARTINA,
    updatedBySlot: MARTINA,
  };

  it('lo que cargó el otro y no revisé, se marca con su nombre', () => {
    const rows = buildMovementList({
      facts: personalFacts({
        spaces: [membership({ facts: spaceFacts({ expenses: [delSuper] }), mySlot: RENZO })],
      }),
      ...options,
    });
    expect(rows[0]?.reviewTag).toBe('Lo cargó Martina · para revisar');
  });

  it('ya revisado, no', () => {
    const rows = buildMovementList({
      facts: personalFacts({
        spaces: [
          membership({
            facts: spaceFacts({ expenses: [delSuper] }),
            mySlot: RENZO,
            reviews: [{ sourceId: 'super', reviewedAt: '2026-10-06T00:00:00+00:00' }],
          }),
        ],
      }),
      ...options,
    });
    expect(rows[0]?.reviewTag).toBeNull();
  });

  it('lo propio nunca', () => {
    const rows = buildMovementList({
      facts: personalFacts({ movements: [movement({ amount: 5_000, date: '2026-10-02' })] }),
      ...options,
    });
    expect(rows[0]?.reviewTag).toBeNull();
  });
});

describe('§16 · la lista de Movimientos', () => {
  it('K9 · de un gasto compartido, la cifra principal es TU PARTE y el total va aparte', () => {
    // Caso C de §29.1: super $100.000, pagó Renzo, 50/50.
    const casa = spaceFacts({
      expenses: [
        sharedExpense({
          amount: 100_000,
          date: '2026-10-05',
          payerSlot: RENZO,
          description: 'Supermercado',
        }),
      ],
    });

    const rows = buildMovementList({
      facts: personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] }),
      ...options,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'shared-expense',
      label: 'Supermercado',
      // K9 · tu parte, no el total.
      amount: 50_000,
      total: 100_000,
    });
  });

  it('§16 · "Casa · pagó Martina" cuando pagó el otro miembro', () => {
    const casa = spaceFacts({
      expenses: [
        sharedExpense({ amount: 40_000, date: '2026-10-03', payerSlot: MARTINA, description: 'Internet' }),
      ],
    });

    const rows = buildMovementList({
      facts: personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] }),
      ...options,
    });

    expect(rows[0]?.context).toBe('Casa · pagó Martina');
    expect(rows[0]?.amount).toBe(20_000);
  });

  it('§16 · una compra en cuotas aparece UNA vez, en su fecha de compra', () => {
    // Si se listaran ocurrencias, la heladera aparecería 6 veces.
    const facts = personalFacts({
      movements: [
        movement({
          amount: 600_000,
          date: '2026-10-10',
          paymentMethodId: visa.id,
          description: 'Heladera',
          installments: { count: 6, card: visa },
        }),
      ],
    });

    const rows = buildMovementList({ facts, ...options });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(600_000);
    expect(rows[0]?.effect).toBe('6 cuotas de $100.000');
  });

  it('CA-53 · una compra con tarjeta en 1 pago muestra en qué mes se paga', () => {
    const facts = personalFacts({
      movements: [movement({ amount: 80_000, date: '2026-10-20', paymentMethodId: visa.id })],
    });

    const rows = buildMovementList({ facts, ...options });
    expect(rows[0]?.effect).toBe('Se paga en noviembre');
  });

  it('un ingreso se rotula "Ingreso registrado"', () => {
    const facts = personalFacts({
      movements: [
        movement({ kind: 'income', amount: 1_200_000, date: '2026-10-05', category: 'sueldo' }),
      ],
    });

    const rows = buildMovementList({ facts, ...options });
    expect(rows[0]).toMatchObject({ kind: 'personal-income', effect: 'Ingreso registrado' });
  });

  it('P-04 · un pago entre miembros lleva la nota "no cambia tu radar"', () => {
    const casa = spaceFacts({
      payments: [
        memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-31' }),
      ],
    });

    const rows = buildMovementList({
      facts: personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] }),
      ...options,
    });

    expect(rows[0]).toMatchObject({
      kind: 'member-payment',
      label: 'Martina te pagó',
      amount: 20_000,
      note: 'no cambia tu radar',
    });
  });

  it('C-05 · si pagó el otro, no se muestra ningún medio de pago', () => {
    // El gasto lo pagó Martina con SU tarjeta: Renzo no puede saber con qué.
    const casa = spaceFacts({
      expenses: [
        sharedExpense({
          id: 'super-martina',
          amount: 90_000,
          date: '2026-10-18',
          payerSlot: MARTINA,
          description: 'Supermercado',
        }),
      ],
    });

    const rows = buildMovementList({
      facts: personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] }),
      ...options,
    });

    expect(rows[0]?.effect).toBeNull();
  });

  it('§12 · cada fila declara su audiencia', () => {
    const casa = spaceFacts({
      expenses: [sharedExpense({ amount: 100_000, date: '2026-10-05', payerSlot: RENZO })],
    });

    const rows = buildMovementList({
      facts: personalFacts({
        movements: [movement({ amount: 20_000, date: '2026-10-06', paymentMethodId: debito.id })],
        spaces: [membership({ facts: casa, mySlot: RENZO })],
      }),
      ...options,
    });

    const personal = rows.find((row) => row.spaceId == null);
    const shared = rows.find((row) => row.spaceId != null);

    expect(personal?.audience).toEqual({ kind: 'private' });
    expect(shared?.audience).toEqual({ kind: 'shared', otherMemberName: 'Martina' });
  });

  it('ordena del más reciente al más viejo', () => {
    const facts = personalFacts({
      movements: [
        movement({ amount: 10_000, date: '2026-10-03', paymentMethodId: debito.id }),
        movement({ amount: 20_000, date: '2026-10-20', paymentMethodId: debito.id }),
        movement({ amount: 30_000, date: '2026-10-12', paymentMethodId: debito.id }),
      ],
    });

    const rows = buildMovementList({ facts, ...options });
    expect(rows.map((row) => row.date)).toEqual(['2026-10-20', '2026-10-12', '2026-10-03']);
  });

  it('N-07 · solo trae el mes pedido', () => {
    const facts = personalFacts({
      movements: [
        movement({ amount: 10_000, date: '2026-09-28', paymentMethodId: debito.id }),
        movement({ amount: 20_000, date: '2026-10-02', paymentMethodId: debito.id }),
      ],
    });

    expect(buildMovementList({ facts, ...options })).toHaveLength(1);
  });
});

describe('§16 · filtros "Todos · Personales · uno por espacio"', () => {
  const casa = spaceFacts({
    expenses: [sharedExpense({ amount: 100_000, date: '2026-10-05', payerSlot: RENZO })],
  });

  const facts = personalFacts({
    movements: [movement({ amount: 20_000, date: '2026-10-06', paymentMethodId: debito.id })],
    spaces: [membership({ facts: casa, mySlot: RENZO })],
  });

  const rows = buildMovementList({ facts, ...options });

  it('"Todos" trae lo personal y lo compartido', () => {
    expect(filterMovements(rows, 'all')).toHaveLength(2);
  });

  it('"Personales" deja afuera lo compartido', () => {
    const personal = filterMovements(rows, 'personal');
    expect(personal).toHaveLength(1);
    expect(personal[0]?.spaceId).toBeNull();
  });

  it('el filtro de un espacio deja solo lo de ese espacio', () => {
    const only = filterMovements(rows, 'casa');
    expect(only).toHaveLength(1);
    expect(only[0]?.spaceId).toBe('casa');
  });

  it('los chips de filtro salen de los espacios con movimientos en el mes', () => {
    expect(spacesInMonth(facts, '2026-10')).toEqual([{ id: 'casa', name: 'Casa' }]);
  });
});
