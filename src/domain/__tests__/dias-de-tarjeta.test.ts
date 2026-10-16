/**
 * Corregir los días de una tarjeta (§22, T-03, T-05, T-06, Q-02, Q-03, P2, C-05).
 *
 * Se recalcula solo lo que se paga este mes o después. Cada compra guarda UN
 * plan (primer mes, cantidad y un día de impacto): se recalcula el día, pero se
 * respetan los meses que ya pasaron. Ningún total de un mes pasado cambia.
 *
 * Hoy en estos tests: 16 de octubre de 2026.
 */

import { describe, it, expect } from 'vitest';
import { addDays } from '../calendar';
import { planCardDaysChange, reverseWrites, type PlanWrite } from '../cardDays';
import { expandPersonalOccurrences } from '../occurrences';
import type { PaymentMethod, PersonalFacts } from '../types';
import {
  casa,
  debito,
  membership,
  MARTINA,
  movement,
  paidWith,
  personalFacts,
  personalRecurrence,
  RENZO,
  sharedExpense,
  sharedRecurrence,
  spaceFacts,
  visa,
} from './fixtures';

const HOY = '2026-10-16';

/** Cierra ~15, vence ~2: lo que el usuario puso con "Más o menos". */
const antes: PaymentMethod = {
  ...visa,
  closingDay: 15,
  dueDay: 2,
  closingApprox: true,
  dueApprox: true,
};

/** Cierra 25, vence 5: los días exactos. */
const ahora: PaymentMethod = visa;

function plan(facts: PersonalFacts, before = antes, after = ahora) {
  return planCardDaysChange({ before, after, facts, today: HOY });
}

describe('sin cambio de días no hay nada que mover', () => {
  it('cambiar solo el nombre no toca ningún plan, ni uno fijado a mano', () => {
    const fijadoAMano = movement({
      amount: 60_000,
      date: '2026-08-20',
      paymentMethodId: visa.id,
      installments: { count: 6, card: antes, pinnedFirstMonth: '2026-12' },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [fijadoAMano] });

    const result = plan(facts, antes, { ...antes, name: 'Visa Plata' });

    expect(result.items).toEqual([]);
    expect(result.writes).toEqual([]);
    expect(result.fromMonth).toBeNull();
  });

  it('pasar de "Más o menos" a ese mismo día exacto no mueve nada', () => {
    const compra = movement({
      amount: 60_000,
      date: '2026-10-10',
      paymentMethodId: visa.id,
      installments: { count: 6, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [compra] });

    const result = plan(facts, antes, { ...antes, closingApprox: false, dueApprox: false });

    expect(result.items).toEqual([]);
    expect(result.writes).toEqual([]);
  });
});

describe('compras en cuotas · se recalcula el día, no los meses que ya pasaron', () => {
  it('una cuota de este mes que caía el 2 pasa al 5 y sigue en octubre, aunque el cálculo nuevo la pondría en septiembre', () => {
    const zapatillas = movement({
      id: 'zapatillas',
      description: 'Zapatillas',
      amount: 120_000,
      date: '2026-08-20',
      paymentMethodId: visa.id,
      installments: { count: 6, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [zapatillas] });

    const result = plan(facts);

    expect(result.writes).toEqual([
      {
        source: { kind: 'movement', id: 'zapatillas' },
        previous: { count: 6, firstMonth: '2026-10', impactDay: 2, approximate: false },
        plan: { count: 6, firstMonth: '2026-10', impactDay: 5, approximate: false },
      },
    ]);
    expect(result.items).toEqual([
      {
        key: 'movement:zapatillas',
        kind: 'installments',
        label: 'Zapatillas',
        spaceName: null,
        otherMemberName: null,
        installment: { index: 1, count: 6 },
        before: { month: '2026-10', date: '2026-10-02', approx: true },
        after: { month: '2026-10', date: '2026-10-05', approx: false },
      },
    ]);
    expect(result.fromMonth).toBe('2026-10');
  });

  it('si el primer mes ya pasó, se conserva el guardado y solo se actualiza el día', () => {
    // Antes: cierre 15 → 20/6 cierra el 15/7 y vence el 2/8 (primer mes: agosto).
    // El cálculo nuevo daría julio (cierre 25, vence el 5/7), pero agosto ya pasó.
    const bici = movement({
      id: 'bici',
      description: 'Bici',
      amount: 180_000,
      date: '2026-06-20',
      paymentMethodId: visa.id,
      installments: { count: 6, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [bici] });

    const result = plan(facts);

    expect(result.writes[0]?.previous.firstMonth).toBe('2026-08');
    expect(result.writes[0]?.plan).toEqual({
      count: 6,
      firstMonth: '2026-08',
      impactDay: 5,
      approximate: false,
    });
    // La primera cuota que se paga este mes o después es la 3 (agosto, septiembre, octubre).
    expect(result.items[0]?.installment).toEqual({ index: 3, count: 6 });
    expect(result.items[0]?.before).toEqual({ month: '2026-10', date: '2026-10-02', approx: true });
    expect(result.items[0]?.after).toEqual({ month: '2026-10', date: '2026-10-05', approx: false });
  });

  it('si el primer mes es el actual o futuro, puede moverse', () => {
    // Compra de hoy: antes → cierra el 15/11, vence el 2/12. Ahora → cierra el 25/10, vence el 5/11.
    const mesa = movement({
      id: 'mesa',
      description: 'Mesa',
      amount: 90_000,
      date: HOY,
      paymentMethodId: visa.id,
      installments: { count: 3, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [mesa] });

    const result = plan(facts);

    expect(result.writes[0]?.previous.firstMonth).toBe('2026-12');
    expect(result.writes[0]?.plan.firstMonth).toBe('2026-11');
    expect(result.items[0]?.before).toEqual({ month: '2026-12', date: '2026-12-02', approx: true });
    expect(result.items[0]?.after).toEqual({ month: '2026-11', date: '2026-11-05', approx: false });
    expect(result.fromMonth).toBe('2026-11');
  });

  it('un plan futuro que cambia solo de día no se mueve de mes', () => {
    const notebook = movement({
      id: 'notebook',
      amount: 300_000,
      date: '2026-10-10',
      paymentMethodId: visa.id,
      installments: { count: 6, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [notebook] });

    const result = plan(facts);

    expect(result.writes[0]?.plan).toEqual({
      count: 6,
      firstMonth: '2026-11',
      impactDay: 5,
      approximate: false,
    });
    expect(result.items[0]?.installment).toEqual({ index: 1, count: 6 });
  });

  it('un plan cuyas cuotas ya pasaron todas no se toca', () => {
    // Junio, julio y agosto: nada que se pague este mes o después.
    const mochila = movement({
      amount: 45_000,
      date: '2026-05-10',
      paymentMethodId: visa.id,
      installments: { count: 3, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [mochila] });

    const result = plan(facts);

    expect(result.writes).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it('nunca manda un plan futuro a un mes pasado: el primer mes no baja del actual', () => {
    // Compra del 30/8, antes cierre 25 → cierra el 25/9, vence el 5/10 (primer mes: octubre).
    // Ahora cierre 31 → cierra el 31/8, vence el 5/9: septiembre ya pasó.
    const compra = movement({
      id: 'compra',
      amount: 60_000,
      date: '2026-08-30',
      paymentMethodId: visa.id,
      installments: { count: 4, card: visa },
    });
    const facts = personalFacts({ paymentMethods: [visa], movements: [compra] });

    const result = plan(facts, visa, { ...visa, closingDay: 31, dueDay: 10 });

    expect(result.writes[0]?.previous.firstMonth).toBe('2026-10');
    expect(result.writes[0]?.plan).toEqual({
      count: 4,
      firstMonth: '2026-10',
      impactDay: 10,
      approximate: false,
    });
  });

  it('lo fijado a mano no se distingue: se recalcula como todo lo demás', () => {
    const fijado = movement({
      id: 'fijado',
      amount: 60_000,
      date: '2026-10-10',
      paymentMethodId: visa.id,
      installments: { count: 4, card: antes, pinnedFirstMonth: '2027-01' },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [fijado] });

    const result = plan(facts);

    expect(result.writes[0]?.previous.firstMonth).toBe('2027-01');
    expect(result.writes[0]?.plan.firstMonth).toBe('2026-11');
  });

  it('solo las compras con ESTA tarjeta', () => {
    const conDebito = movement({
      amount: 60_000,
      date: '2026-10-10',
      paymentMethodId: debito.id,
      installments: { count: 4, card: null },
    });
    const facts = personalFacts({ paymentMethods: [antes, debito], movements: [conDebito] });

    expect(plan(facts).writes).toEqual([]);
  });

  it('"No sé" el vencimiento: el plan queda sin día y marcado aproximado (T-05)', () => {
    const compra = movement({
      id: 'compra',
      description: 'Heladera',
      amount: 60_000,
      date: '2026-10-10',
      paymentMethodId: visa.id,
      installments: { count: 4, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [compra] });

    const result = plan(facts, antes, { ...antes, dueDay: null, dueApprox: false });

    expect(result.writes[0]?.plan).toEqual({
      count: 4,
      firstMonth: '2026-11',
      impactDay: null,
      approximate: true,
    });
    expect(result.items[0]?.after).toEqual({ month: '2026-11', date: null, approx: false });
  });
});

describe('compras en 1 pago', () => {
  it('entra si su resumen todavía no venció y cambia de mes', () => {
    // Hoy 16/10. Antes: cierra el 15/11 y vence el 2/12. Ahora: cierra el 25/10 y vence el 5/11.
    const zapas = movement({
      id: 'zapas',
      description: 'Zapas',
      amount: 50_000,
      date: HOY,
      paymentMethodId: visa.id,
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [zapas] });

    const result = plan(facts);

    expect(result.writes).toEqual([]);
    expect(result.items).toEqual([
      {
        key: 'movement:zapas',
        kind: 'purchase',
        label: 'Zapas',
        spaceName: null,
        otherMemberName: null,
        installment: null,
        before: { month: '2026-12', date: '2026-12-02', approx: true },
        after: { month: '2026-11', date: '2026-11-05', approx: false },
      },
    ]);
  });

  it('si solo cambia el día dentro del mismo mes, no entra en la lista', () => {
    const compra = movement({
      amount: 50_000,
      date: '2026-10-10',
      paymentMethodId: visa.id,
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [compra] });

    expect(plan(facts).items).toEqual([]);
  });

  it('una compra con otro medio o al contado no entra', () => {
    const facts = personalFacts({
      paymentMethods: [antes, debito],
      movements: [movement({ amount: 1_000, date: HOY, paymentMethodId: debito.id })],
    });

    expect(plan(facts).items).toEqual([]);
  });

  it('una compra de un mes pasado no cambia de mes: la tarjeta recuerda los días de antes', () => {
    const facts = personalFacts({
      paymentMethods: [antes],
      movements: [
        // Vencía el 2/8: con 25 y 5 vencería el 5/7, pero agosto ya pasó y se queda.
        movement({ amount: 10_000, date: '2026-06-20', paymentMethodId: visa.id }),
        movement({ amount: 10_000, date: '2026-07-05', paymentMethodId: visa.id }),
      ],
    });

    const result = plan(facts);

    expect(result.items).toEqual([]);
    expect(result.writes).toEqual([]);
  });

  it('si lo que se paga este mes caería en un mes pasado con los días nuevos, no se mueve hacia atrás', () => {
    // Antes vencía el 2/10 (este mes); con 25 y 5 cerraría el 25/8 y vencería el 5/9.
    const facts = personalFacts({
      paymentMethods: [antes],
      movements: [movement({ id: 'agosto', amount: 10_000, date: '2026-08-20', paymentMethodId: visa.id })],
    });

    expect(plan(facts).items).toEqual([]);
  });
});

describe('fijos con esa tarjeta', () => {
  const netflix = personalRecurrence({
    id: 'netflix',
    kind: 'expense',
    amount: 9_000,
    dayOfMonth: 28,
    startMonth: '2026-01',
    category: 'suscripciones',
    paymentMethodId: visa.id,
    description: 'Netflix',
  });

  it('entra con la primera ocurrencia que se paga este mes o después y no guarda ningún plan', () => {
    const facts = personalFacts({ paymentMethods: [antes], recurrences: [netflix] });

    const result = plan(facts);

    expect(result.writes).toEqual([]);
    expect(result.items).toEqual([
      {
        key: 'recurrence:netflix',
        kind: 'fixed',
        label: 'Netflix',
        spaceName: null,
        otherMemberName: null,
        installment: null,
        // La del 28/8 todavía se paga este mes: antes cerraba el 15/9 y vencía el 2/10;
        // ahora cierra el 25/9 y vence el 5/10.
        before: { month: '2026-10', date: '2026-10-02', approx: true },
        after: { month: '2026-10', date: '2026-10-05', approx: false },
      },
    ]);
  });

  it('un fijo que ya terminó antes del último resumen no entra', () => {
    const terminado = { ...netflix, endMonth: '2026-06' };
    const facts = personalFacts({ paymentMethods: [antes], recurrences: [terminado] });

    expect(plan(facts).items).toEqual([]);
  });

  it('un fijo con otra tarjeta, o un ingreso, no entra', () => {
    const facts = personalFacts({
      paymentMethods: [antes, debito],
      recurrences: [
        { ...netflix, id: 'otro', paymentMethodId: debito.id },
        personalRecurrence({
          kind: 'income',
          amount: 1_000_000,
          dayOfMonth: 5,
          startMonth: '2026-01',
          category: 'sueldo',
        }),
      ],
    });

    expect(plan(facts).items).toEqual([]);
  });
});

describe('lo compartido que pagó el usuario con esa tarjeta (C-05, P2)', () => {
  function heladeraConLaTarjeta() {
    const heladera = sharedExpense({
      id: 'heladera',
      description: 'Heladera',
      amount: 600_000,
      date: '2026-09-25',
      payerSlot: RENZO,
      installments: { count: 6, card: antes },
    });
    return {
      heladera,
      facts: personalFacts({
        paymentMethods: [antes, debito],
        spaces: [
          membership({
            facts: spaceFacts({ expenses: [heladera] }),
            mySlot: RENZO,
            paymentDetails: [paidWith('heladera', RENZO, visa.id)],
          }),
        ],
      }),
    };
  }

  it('recalcula el plan de la compra compartida y la lista dice el espacio y con quién', () => {
    const { facts } = heladeraConLaTarjeta();

    const result = plan(facts);

    // Antes: cierra el 15/10, vence el 2/11 (noviembre). Ahora: cierra el 25/9, vence el 5/10.
    expect(result.writes).toEqual([
      {
        source: { kind: 'sharedExpense', id: 'heladera', spaceId: 'casa', mySlot: RENZO },
        previous: { count: 6, firstMonth: '2026-11', impactDay: 2, approximate: false },
        plan: { count: 6, firstMonth: '2026-10', impactDay: 5, approximate: false },
      },
    ]);
    expect(result.items).toEqual([
      {
        key: 'sharedExpense:heladera',
        kind: 'installments',
        label: 'Heladera',
        spaceName: 'Casa',
        otherMemberName: 'Martina',
        installment: { index: 1, count: 6 },
        before: { month: '2026-11', date: '2026-11-02', approx: true },
        after: { month: '2026-10', date: '2026-10-05', approx: false },
      },
    ]);
  });

  it('lo que pagó el otro con SU tarjeta no se toca: este usuario no la ve', () => {
    const delOtro = sharedExpense({
      id: 'del-otro',
      amount: 600_000,
      date: '2026-09-25',
      payerSlot: MARTINA,
      installments: { count: 6, card: antes },
    });
    const facts = personalFacts({
      paymentMethods: [antes],
      spaces: [
        membership({
          facts: spaceFacts({ expenses: [delOtro] }),
          mySlot: RENZO,
          // Aunque el id de la tarjeta coincida: el detalle de pago del otro no es de este usuario.
          paymentDetails: [],
        }),
      ],
    });

    expect(plan(facts).writes).toEqual([]);
    expect(plan(facts).items).toEqual([]);
  });

  it('lo que pagó este usuario con otro medio no se toca', () => {
    const { heladera } = heladeraConLaTarjeta();
    const facts = personalFacts({
      paymentMethods: [antes, debito],
      spaces: [
        membership({
          facts: spaceFacts({ expenses: [heladera] }),
          mySlot: RENZO,
          paymentDetails: [paidWith('heladera', RENZO, debito.id)],
        }),
      ],
    });

    expect(plan(facts).writes).toEqual([]);
  });

  it('un espacio que el usuario dejó no se toca: ya no puede escribir ahí', () => {
    const { heladera } = heladeraConLaTarjeta();
    const facts = personalFacts({
      paymentMethods: [antes],
      spaces: [
        membership({
          facts: spaceFacts({ expenses: [heladera] }),
          mySlot: RENZO,
          paymentDetails: [paidWith('heladera', RENZO, visa.id)],
          leftOn: '2026-10-01',
        }),
      ],
    });

    expect(plan(facts).writes).toEqual([]);
  });

  it('un gasto compartido en 1 pago pagado con la tarjeta entra si cambia de mes, sin tocar la fecha del saldo (P19)', () => {
    const puntual = sharedExpense({
      id: 'puntual',
      description: 'Verdulería',
      amount: 20_000,
      date: HOY,
      payerSlot: RENZO,
    });
    const facts = personalFacts({
      paymentMethods: [antes],
      spaces: [
        membership({
          facts: spaceFacts({ expenses: [puntual] }),
          mySlot: RENZO,
          paymentDetails: [paidWith('puntual', RENZO, visa.id)],
        }),
      ],
    });

    const result = plan(facts);

    expect(result.writes).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ kind: 'purchase', spaceName: 'Casa', installment: null });
  });

  it('un fijo compartido que pagó este usuario con la tarjeta entra como fijo', () => {
    const luz = sharedRecurrence({
      id: 'luz',
      amount: 30_000,
      dayOfMonth: 28,
      startMonth: '2026-01',
      payerSlot: RENZO,
      description: 'Luz',
    });
    const facts = personalFacts({
      paymentMethods: [antes],
      spaces: [
        membership({
          facts: spaceFacts({ space: casa(), recurrences: [luz] }),
          mySlot: RENZO,
          paymentDetails: [paidWith('luz', RENZO, visa.id)],
        }),
      ],
    });

    const result = plan(facts);

    expect(result.writes).toEqual([]);
    expect(result.items[0]).toMatchObject({
      key: 'recurrence:luz',
      kind: 'fixed',
      label: 'Luz',
      spaceName: 'Casa',
      otherMemberName: 'Martina',
    });
  });
});

describe('la lista', () => {
  it('una compra o un fijo es UN pago, con todas sus cuotas que siguen, ordenados por cuándo se pagan', () => {
    const facts = personalFacts({
      paymentMethods: [antes],
      movements: [
        movement({
          id: 'a',
          amount: 90_000,
          date: HOY,
          paymentMethodId: visa.id,
          installments: { count: 12, card: antes },
        }),
        movement({
          id: 'b',
          amount: 300_000,
          date: '2026-10-10',
          paymentMethodId: visa.id,
          installments: { count: 6, card: antes },
        }),
        movement({ id: 'c', amount: 50_000, date: HOY, paymentMethodId: visa.id }),
      ],
    });

    const result = plan(facts);

    expect(result.items).toHaveLength(3);
    const months = result.items.map((item) => item.before.month);
    expect(months).toEqual([...months].sort());
    expect(result.fromMonth).toBe('2026-11');
  });
});

describe('deshacer', () => {
  it('invierte cada plan: lo que había vuelve a ser el plan', () => {
    const write: PlanWrite = {
      source: { kind: 'movement', id: 'x' },
      previous: { count: 6, firstMonth: '2026-10', impactDay: 2, approximate: false },
      plan: { count: 6, firstMonth: '2026-10', impactDay: 5, approximate: false },
    };

    expect(reverseWrites([write])).toEqual([
      {
        source: { kind: 'movement', id: 'x' },
        previous: write.plan,
        plan: write.previous,
      },
    ]);
  });
});

/* ── La garantía: ningún total de un mes pasado cambia ───────────────────── */

function applyWrites(
  facts: PersonalFacts,
  writes: readonly PlanWrite[],
  card: PaymentMethod,
): PersonalFacts {
  const byId = new Map(writes.map((write) => [`${write.source.kind}:${write.source.id}`, write.plan]));
  return {
    ...facts,
    paymentMethods: facts.paymentMethods.map((method) => (method.id === card.id ? card : method)),
    movements: facts.movements.map((item) => {
      const next = byId.get(`movement:${item.id}`);
      return next == null ? item : { ...item, installments: next };
    }),
    spaces: facts.spaces.map((space) => ({
      ...space,
      facts: {
        ...space.facts,
        expenses: space.facts.expenses.map((item) => {
          const next = byId.get(`sharedExpense:${item.id}`);
          return next == null ? item : { ...item, installments: next };
        }),
      },
    })),
  };
}

function totalsByMonth(facts: PersonalFacts): Record<string, number> {
  const { occurrences } = expandPersonalOccurrences(facts, { from: '2025-12', to: '2028-06' });
  const totals: Record<string, number> = {};
  for (const occurrence of occurrences) {
    totals[occurrence.month] = (totals[occurrence.month] ?? 0) + occurrence.total;
  }
  return totals;
}

function pastMonths(totals: Record<string, number>): [string, number][] {
  return Object.entries(totals)
    .filter(([month]) => month < '2026-10')
    .sort(([a], [b]) => (a < b ? -1 : 1));
}

describe('los meses pasados no cambian', () => {
  const combinaciones: [string, PaymentMethod, PaymentMethod][] = [
    ['~15 y ~2 a 25 y 5', antes, ahora],
    ['25 y 5 a 3 y 15', visa, { ...visa, closingDay: 3, dueDay: 15 }],
    ['25 y 5 a solo vencimiento', visa, { ...visa, closingDay: null, dueDay: 10 }],
    ['sin días a 20 y 10', { ...visa, closingDay: null, dueDay: null }, { ...visa, closingDay: 20, dueDay: 10 }],
    ['28 y 31 a 10 y 20', { ...visa, closingDay: 28, dueDay: 31 }, { ...visa, closingDay: 10, dueDay: 20 }],
    ['25 y 5 a 31 y 7', visa, { ...visa, closingDay: 31, dueDay: 7 }],
  ];

  for (const [nombre, before, after] of combinaciones) {
    it(`${nombre}: los totales de los meses pasados son idénticos antes y después`, () => {
      const movements = [];
      const expenses = [];
      const details = [];
      let date = '2026-03-02';
      let n = 0;
      while (date <= HOY) {
        for (const count of [2, 3, 6, 12]) {
          n += 1;
          movements.push(
            movement({
              id: `m${n}`,
              amount: 12_000 * count + 7,
              date,
              paymentMethodId: visa.id,
              installments: { count, card: before },
            }),
          );
        }
        n += 1;
        const shared = sharedExpense({
          id: `s${n}`,
          amount: 24_001,
          date,
          payerSlot: RENZO,
          installments: { count: 4, card: before },
        });
        expenses.push(shared);
        details.push(paidWith(shared.id, RENZO, visa.id));
        date = addDays(date, 9);
      }

      const facts = personalFacts({
        paymentMethods: [before],
        movements,
        spaces: [
          membership({
            facts: spaceFacts({ expenses }),
            mySlot: RENZO,
            paymentDetails: details,
          }),
        ],
      });

      const result = plan(facts, before, after);
      const updated = applyWrites(facts, result.writes, after);

      expect(result.writes.length).toBeGreaterThan(0);
      expect(pastMonths(totalsByMonth(updated))).toEqual(pastMonths(totalsByMonth(facts)));
    });
  }

  it('y lo que se paga de acá en adelante SÍ se mueve (el test de arriba no es vacío)', () => {
    const mesa = movement({
      id: 'mesa',
      amount: 90_000,
      date: HOY,
      paymentMethodId: visa.id,
      installments: { count: 3, card: antes },
    });
    const facts = personalFacts({ paymentMethods: [antes], movements: [mesa] });

    const result = plan(facts);
    const updated = applyWrites(facts, result.writes, ahora);

    expect(totalsByMonth(facts)['2026-11']).toBeUndefined();
    expect(totalsByMonth(updated)['2026-11']).toBe(30_000);
  });
});
