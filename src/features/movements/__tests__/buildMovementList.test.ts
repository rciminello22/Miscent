import { describe, it, expect } from 'vitest';
import { formatMonth, formatPesos } from '@/lib/format';
import {
  buildMovementList,
  filterMovements,
  spacesInMonth,
} from '../buildMovementList';
import { rowDestination } from '../movementsView';
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

  it('CA-27 · lo que cargué yo y editó el otro: "Lo editó Martina"', () => {
    const rows = buildMovementList({
      facts: personalFacts({
        spaces: [
          membership({
            facts: spaceFacts({ expenses: [{ ...delSuper, createdBySlot: RENZO }] }),
            mySlot: RENZO,
          }),
        ],
      }),
      ...options,
    });
    expect(rows[0]?.reviewTag).toBe('Lo editó Martina · para revisar');
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
    expect(rows[0]?.effect).toBe('1 pago · se paga en noviembre');
    expect(rows[0]?.effectKind).toBe('card');
  });

  describe('14 · B · la fila de un compartido dice cómo se paga, de forma simple', () => {
    const casa = (args: { payerSlot: 1 | 2; withCard?: boolean }) => {
      const expense = sharedExpense({
        id: 'heladera',
        amount: 180_000,
        date: '2026-10-12',
        payerSlot: args.payerSlot,
        description: 'Heladera',
      });
      return buildMovementList({
        facts: personalFacts({
          spaces: [
            membership({
              facts: spaceFacts({ expenses: [expense] }),
              mySlot: RENZO,
              paymentDetails:
                args.withCard === true ? [paidWith('heladera', RENZO, visa.id)] : [],
            }),
          ],
        }),
        ...options,
      })[0]!;
    };

    it('pagaste vos con tarjeta, en 1 pago: "1 pago · se paga en noviembre"', () => {
      const result = casa({ payerSlot: RENZO, withCard: true });

      expect(result.effect).toBe('1 pago · se paga en noviembre');
      expect(result.effectKind).toBe('card');
    });

    it('P19 · si pagó el otro en 1 pago no hay mes de tarjeta que mostrar (C-05)', () => {
      const result = casa({ payerSlot: MARTINA });

      expect(result.effect).toBeNull();
      expect(result.effectKind).toBeNull();
    });

    it('pagaste vos sin medio cargado: no se inventa un mes', () => {
      expect(casa({ payerSlot: RENZO }).effect).toBeNull();
    });

    it('en cuotas, pague quien pague, dice cuántas y de cuánto es TU parte', () => {
      const expense = sharedExpense({
        amount: 180_000,
        date: '2026-10-12',
        payerSlot: MARTINA,
        installments: { count: 3, card: null },
      });
      const [result] = buildMovementList({
        facts: personalFacts({
          spaces: [
            membership({ facts: spaceFacts({ expenses: [expense] }), mySlot: RENZO }),
          ],
        }),
        ...options,
      });

      expect(result?.effect).toBe('3 cuotas de $30.000');
      expect(result?.effectKind).toBe('installments');
    });

    it('un gasto personal en débito sigue diciendo el medio, sin "1 pago"', () => {
      const [result] = buildMovementList({
        facts: personalFacts({
          movements: [movement({ amount: 9_000, date: '2026-10-02', paymentMethodId: debito.id })],
        }),
        ...options,
      });

      expect(result?.effect).toBe('Débito');
    });
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

  describe('K9 · la línea de cuotas de un compartido va sobre TU PARTE', () => {
    const lavarropas = (args: Parameters<typeof sharedExpense>[0]) =>
      buildMovementList({
        facts: personalFacts({
          spaces: [
            membership({
              facts: spaceFacts({ expenses: [sharedExpense(args)] }),
              mySlot: RENZO,
            }),
          ],
        }),
        ...options,
      })[0]!;

    it('50/50: $360.000 en 6 cuotas, tu parte $180.000 → "6 cuotas de $30.000"', () => {
      const result = lavarropas({
        amount: 360_000,
        date: '2026-10-14',
        payerSlot: RENZO,
        installments: { count: 6, card: visa },
      });

      expect(result.amount).toBe(180_000);
      expect(result.effect).toBe('6 cuotas de $30.000');
    });

    it('lo mismo si pagó el otro: la parte es la tuya, no depende de quién pagó', () => {
      const result = lavarropas({
        amount: 360_000,
        date: '2026-10-14',
        payerSlot: MARTINA,
        installments: { count: 6, card: visa },
      });

      expect(result.effect).toBe('6 cuotas de $30.000');
    });

    it('reparto personalizado: cada cuota se divide en la misma proporción (CA-51)', () => {
      const mine = lavarropas({
        amount: 360_000,
        date: '2026-10-14',
        payerSlot: RENZO,
        split: { mode: 'custom', shareSlot1: 90_000, shareSlot2: 270_000 },
        installments: { count: 6, card: visa },
      });
      expect(mine.amount).toBe(90_000);
      expect(mine.effect).toBe('6 cuotas de $15.000');
    });

    it('lo personal sigue sobre el total (es todo tuyo)', () => {
      const rows = buildMovementList({
        facts: personalFacts({
          movements: [
            movement({
              amount: 180_000,
              date: '2026-10-14',
              paymentMethodId: visa.id,
              installments: { count: 6, card: visa },
            }),
          ],
        }),
        ...options,
      });

      expect(rows[0]?.effect).toBe('6 cuotas de $30.000');
    });
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

  it('un día deja solo los registros de ese día', () => {
    expect(filterMovements(rows, 'all', '2026-10-06').map((item) => item.date)).toEqual([
      '2026-10-06',
    ]);
    expect(filterMovements(rows, 'all', '2026-10-09')).toEqual([]);
  });

  it('el día se combina con el segmentado', () => {
    expect(filterMovements(rows, 'casa', '2026-10-06')).toEqual([]);
    expect(filterMovements(rows, 'casa', '2026-10-05')).toHaveLength(1);
    expect(filterMovements(rows, 'personal', '2026-10-06')).toHaveLength(1);
  });

  it('sin día no filtra por fecha', () => {
    expect(filterMovements(rows, 'all', null)).toHaveLength(2);
  });

  it('los chips de filtro salen de los espacios con movimientos en el mes', () => {
    expect(spacesInMonth(facts, '2026-10')).toEqual([{ id: 'casa', name: 'Casa' }]);
  });
});

describe('SA-05 · un espacio del que saliste', () => {
  const casa = spaceFacts({
    expenses: [sharedExpense({ amount: 100_000, date: '2026-10-05', payerSlot: MARTINA })],
  });
  const rows = buildMovementList({
    facts: personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO, leftOn: '2026-10-10' })] }),
    ...options,
  });

  it('se dice que ya no sos miembro', () => {
    expect(rows[0]?.context).toBe('Casa · ya no sos miembro · pagó Martina');
  });

  it('el espacio y quién pagó quedan separados, para mostrarlos por separado', () => {
    expect(rows[0]).toMatchObject({
      // El sufijo "Ya no sos miembro" lo pone la fila (rowDetail), no el nombre.
      spaceName: 'Casa',
      payerLabel: 'pagó Martina',
    });
  });

  it('no se puede abrir: ya no hay acceso (SA-02)', () => {
    expect(rows[0]?.formerSpace).toBe(true);
  });
});

describe('bug · tocar una fila REAL de Movimientos abre su detalle, nunca el espacio', () => {
  const build = (membershipArgs: Partial<Parameters<typeof membership>[0]>, facts = spaceFacts()) =>
    buildMovementList({
      facts: personalFacts({
        spaces: [membership({ facts, mySlot: RENZO, ...membershipArgs })],
      }),
      ...options,
    });

  it('un gasto compartido puntual → el detalle del gasto', () => {
    const [row] = build(
      {},
      spaceFacts({
        expenses: [
          sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-05', payerSlot: RENZO }),
        ],
      }),
    );

    expect(row?.id).toBe('shared:super');
    expect(rowDestination(row!)).toEqual({ kind: 'href', href: '/space/casa/gasto/super' });
  });

  it('un gasto compartido en cuotas → el detalle del gasto', () => {
    const [row] = build(
      {},
      spaceFacts({
        expenses: [
          sharedExpense({
            id: 'lavarropas',
            amount: 360_000,
            date: '2026-10-14',
            payerSlot: MARTINA,
            installments: { count: 6, card: visa },
          }),
        ],
      }),
    );

    expect(rowDestination(row!)).toEqual({ kind: 'href', href: '/space/casa/gasto/lavarropas' });
  });

  it('un pago entre miembros → el detalle del pago, NO el espacio (esa era la causa)', () => {
    const [row] = build(
      {},
      spaceFacts({
        payments: [
          memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-12' }),
        ],
      }),
    );

    expect(row?.kind).toBe('member-payment');
    const destination = rowDestination(row!);
    expect(destination?.kind).toBe('href');
    expect(destination).toEqual({
      kind: 'href',
      href: `/space/casa/pagos/${row!.id.replace('payment:', '')}`,
    });
  });

  it('SA-02 · del espacio del que saliste, ni el gasto ni el pago abren nada', () => {
    const rows = build(
      { leftOn: '2026-10-10' },
      spaceFacts({
        expenses: [sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-05', payerSlot: MARTINA })],
        payments: [
          memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-06' }),
        ],
      }),
    );

    expect(rows).toHaveLength(2);
    for (const row of rows) expect(rowDestination(row)).toBeNull();
  });
});

describe('§16 · lo que la fila necesita para ordenarse por día con su ícono', () => {
  const casa = spaceFacts({
    expenses: [sharedExpense({ amount: 100_000, date: '2026-10-05', payerSlot: RENZO, category: 'hogar' })],
    payments: [memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-10' })],
  });
  const rows = buildMovementList({
    facts: personalFacts({
      movements: [
        movement({ amount: 4_500, date: '2026-10-13', category: 'gastronomia' }),
        movement({ amount: 80_000, date: '2026-10-14', category: 'ropa', paymentMethodId: visa.id }),
        movement({
          amount: 600_000,
          date: '2026-10-15',
          category: 'hogar',
          paymentMethodId: visa.id,
          installments: { count: 6, card: visa },
        }),
        movement({ kind: 'income', amount: 1_200_000, date: '2026-10-01', category: 'sueldo' }),
        movement({ amount: 9_000, date: '2026-10-02', paymentMethodId: debito.id }),
      ],
      spaces: [membership({ facts: casa, mySlot: RENZO })],
    }),
    ...options,
  });
  const byDate = (date: string) => rows.find((row) => row.date === date)!;

  it('cada fila lleva su categoría (el ícono guía); un pago entre miembros, ninguna', () => {
    expect(byDate('2026-10-13').category).toBe('gastronomia');
    expect(byDate('2026-10-05').category).toBe('hogar');
    expect(byDate('2026-10-10').category).toBeNull();
  });

  it('el efecto dice de qué tipo es, para elegir su ícono', () => {
    expect(byDate('2026-10-15').effectKind).toBe('installments');
    expect(byDate('2026-10-14').effectKind).toBe('card');
    expect(byDate('2026-10-01').effectKind).toBe('income');
    expect(byDate('2026-10-02').effectKind).toBe('method');
    expect(byDate('2026-10-13').effectKind).toBeNull();
  });

  it('un gasto compartido separa el espacio de quién pagó', () => {
    expect(byDate('2026-10-05')).toMatchObject({ spaceName: 'Casa', payerLabel: 'pagó vos' });
  });

  it('un pago entre miembros trae el espacio y ningún "pagó"', () => {
    expect(byDate('2026-10-10')).toMatchObject({ spaceName: 'Casa', payerLabel: null });
  });

  it('lo personal no trae espacio ni "pagó"', () => {
    expect(byDate('2026-10-13')).toMatchObject({ spaceName: null, payerLabel: null });
  });
});
