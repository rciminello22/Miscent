/**
 * La historia de los días de una tarjeta (T-03, T-05, T-06, §22, F-01, N-02, N-03).
 *
 * Corregir el cierre o el vencimiento NUNCA cambia un mes pasado. Las compras en
 * cuotas ya guardan su plan; las compras en 1 pago y los fijos con tarjeta no
 * guardan nada: su mes de pago sale de los días de la tarjeta. Por eso la tarjeta
 * recuerda los días que tuvo antes de cada corrección.
 *
 * El corte: una corrección vale para lo que, con los días de antes Y con los de
 * ahora, se paga en el mes de la corrección o después. Lo que se pagó (o se paga)
 * en un mes anterior conserva los días de antes, y lo que con los días nuevos
 * caería en un mes pasado también (nunca se mueve hacia atrás).
 *
 * Hoy en estos tests: 16 de octubre de 2026.
 */

import { describe, it, expect } from 'vitest';
import { addDays, addMonths } from '../calendar';
import { changeCardDays, resolveCardPayment } from '../cards';
import { planCardDaysChange, type PlanWrite } from '../cardDays';
import { expandPersonalOccurrences } from '../occurrences';
import { radarForMonth } from '../radar';
import { estimatedStatement } from '../upcoming';
import type { CardDays, PaymentMethod, PersonalFacts } from '../types';
import {
  membership,
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

function dias(closingDay: number | null, dueDay: number | null, approx = false): CardDays {
  return {
    closingDay,
    dueDay,
    closingApprox: approx && closingDay != null,
    dueApprox: approx && dueDay != null,
  };
}

function tarjeta(days: CardDays): PaymentMethod {
  return { ...visa, ...days };
}

describe('changeCardDays · la tarjeta recuerda los días de antes', () => {
  it('guarda los días anteriores hasta el día de la corrección y toma los nuevos', () => {
    const corregida = changeCardDays(tarjeta(dias(25, 5)), dias(15, 10), HOY);

    expect(corregida.closingDay).toBe(15);
    expect(corregida.dueDay).toBe(10);
    expect(corregida.daysHistory).toEqual([{ ...dias(25, 5), until: HOY }]);
  });

  it('guarda también la marca de "Más o menos" de los días de antes', () => {
    const corregida = changeCardDays(tarjeta(dias(15, 2, true)), dias(25, 5), HOY);

    expect(corregida.daysHistory).toEqual([{ ...dias(15, 2, true), until: HOY }]);
  });

  it('si los días no cambian, no suma una versión', () => {
    const card = tarjeta(dias(25, 5));

    expect(changeCardDays(card, dias(25, 5), HOY).daysHistory ?? []).toEqual([]);
  });

  it('dos correcciones el mismo día no duplican la versión: queda la de antes de la primera', () => {
    const primera = changeCardDays(tarjeta(dias(25, 5)), dias(15, 10), HOY);
    const segunda = changeCardDays(primera, dias(28, 1), HOY);

    expect(segunda.closingDay).toBe(28);
    expect(segunda.daysHistory).toEqual([{ ...dias(25, 5), until: HOY }]);
  });

  it('las correcciones de días distintos se acumulan', () => {
    const primera = changeCardDays(tarjeta(dias(25, 5)), dias(15, 10), '2026-07-10');
    const segunda = changeCardDays(primera, dias(28, 1), HOY);

    expect(segunda.daysHistory).toEqual([
      { ...dias(25, 5), until: '2026-07-10' },
      { ...dias(15, 10), until: HOY },
    ]);
  });
});

describe('resolveCardPayment con historia · el corte de "este mes"', () => {
  const nueva = changeCardDays(tarjeta(dias(25, 5)), dias(15, 10), HOY);

  it('una compra que se pagó en un mes pasado conserva los días de antes', () => {
    // 20/8: cierra el 25/8 y vence el 5/9. Con 15 y 10 vencería el 10/10.
    const schedule = resolveCardPayment(nueva, '2026-08-20');

    expect(schedule).toEqual({ month: '2026-09', dueDate: '2026-09-05', approximate: false });
  });

  it('sin la historia, esa misma compra sí se movería: el test de arriba no es vacío', () => {
    const sinHistoria: PaymentMethod = { ...nueva, daysHistory: undefined };

    expect(resolveCardPayment(sinHistoria, '2026-08-20').month).toBe('2026-10');
  });

  it('una compra que se paga este mes se recalcula con los días nuevos', () => {
    // 20/9: con 25 y 5 vencía el 5/10 (este mes). Con 15 y 10 cierra el 15/10 y vence el 10/11.
    expect(resolveCardPayment(nueva, '2026-09-20')).toEqual({
      month: '2026-11',
      dueDate: '2026-11-10',
      approximate: false,
    });
  });

  it('una compra de ayer, con el resumen sin vencer, usa los días nuevos', () => {
    // 15/10: con 25 y 5 vencía el 5/11. Con 14 y 3 cierra el 14/11 y vence el 3/12.
    const corregida = changeCardDays(tarjeta(dias(25, 5)), dias(14, 3), HOY);

    expect(resolveCardPayment(corregida, '2026-10-15')).toEqual({
      month: '2026-12',
      dueDate: '2026-12-03',
      approximate: false,
    });
  });

  it('una compra de más adelante usa los días nuevos', () => {
    // 20/12: con 25 y 5 vencía el 5/1. Con 15 y 10 cierra el 15/1 y vence el 10/2.
    expect(resolveCardPayment(nueva, '2026-12-20').month).toBe('2027-02');
  });

  it('lo que con los días nuevos caería en un mes pasado se queda donde estaba', () => {
    // Antes (15 y 2): 20/8 cierra el 15/9 y vence el 2/10 (este mes). Con 25 y 5
    // vencería el 5/9, un mes que ya pasó: no se mueve hacia atrás.
    const corregida = changeCardDays(tarjeta(dias(15, 2)), dias(25, 5), HOY);

    expect(resolveCardPayment(corregida, '2026-08-20')).toEqual({
      month: '2026-10',
      dueDate: '2026-10-02',
      approximate: false,
    });
  });

  it('con varias correcciones cada una corta en su propio mes', () => {
    const primera = changeCardDays(tarjeta(dias(25, 5)), dias(15, 10), '2026-07-10');
    const segunda = changeCardDays(primera, dias(28, 1), HOY);

    // 20/6: vencía el 5/7; en la corrección de julio pasa al 10/8, que la de
    // octubre ya no toca (agosto es un mes pasado).
    expect(resolveCardPayment(segunda, '2026-06-20')).toEqual({
      month: '2026-08',
      dueDate: '2026-08-10',
      approximate: false,
    });
    // 20/9: pasa al 10/11 con la de julio y al 1/10 con la de octubre.
    expect(resolveCardPayment(segunda, '2026-09-20')).toEqual({
      month: '2026-10',
      dueDate: '2026-10-01',
      approximate: false,
    });
  });

  it('una tarjeta sin historia se calcula como siempre', () => {
    expect(resolveCardPayment(tarjeta(dias(25, 5)), '2026-10-20')).toEqual({
      month: '2026-11',
      dueDate: '2026-11-05',
      approximate: false,
    });
  });
});

describe('las ocurrencias usan los días que valían', () => {
  it('una compra pasada sigue con la fecha "~" de antes aunque ahora los días sean exactos', () => {
    const corregida = changeCardDays(tarjeta(dias(15, 2, true)), dias(25, 5), HOY);
    const pasada = movement({ id: 'pasada', amount: 10_000, date: '2026-06-20', paymentMethodId: visa.id });
    const futura = movement({ id: 'futura', amount: 10_000, date: '2026-11-20', paymentMethodId: visa.id });
    const facts = personalFacts({ paymentMethods: [corregida], movements: [pasada, futura] });

    const { occurrences } = expandPersonalOccurrences(facts, { from: '2026-06', to: '2027-01' });
    const deLaPasada = occurrences.find((item) => item.id === 'movement:pasada');
    const deLaFutura = occurrences.find((item) => item.id === 'movement:futura');

    expect(deLaPasada).toMatchObject({ month: '2026-08', paymentDate: '2026-08-02', dateApprox: true });
    expect(deLaFutura).toMatchObject({ month: '2026-12', paymentDate: '2026-12-05', dateApprox: false });
  });

  it('un fijo con tarjeta conserva los meses pasados y recalcula los que vienen', () => {
    const corregida = changeCardDays(tarjeta(dias(25, 5)), dias(15, 10), HOY);
    const netflix = personalRecurrence({
      id: 'netflix',
      kind: 'expense',
      amount: 9_000,
      dayOfMonth: 20,
      startMonth: '2026-01',
      category: 'suscripciones',
      paymentMethodId: visa.id,
    });
    const facts = personalFacts({ paymentMethods: [corregida], recurrences: [netflix] });

    const { occurrences } = expandPersonalOccurrences(facts, { from: '2026-01', to: '2027-03' });
    const pagoEn = (month: string) =>
      occurrences.find((item) => item.id === `recurrence:netflix:${month}`)?.paymentDate;

    // Agosto (20/8) vence el 5/9, como antes. Octubre (20/10) cierra el 15/11 y vence el 10/12.
    expect(pagoEn('2026-08')).toBe('2026-09-05');
    expect(pagoEn('2026-10')).toBe('2026-12-10');
  });
});

describe('corregir los días no mueve ningún mes pasado', () => {
  const combinaciones: [string, CardDays, CardDays][] = [
    ['~15 y ~2 a 25 y 5', dias(15, 2, true), dias(25, 5)],
    ['25 y 5 a 3 y 15', dias(25, 5), dias(3, 15)],
    ['25 y 5 a solo vencimiento', dias(25, 5), dias(null, 10)],
    ['sin días a 20 y 10', dias(null, null), dias(20, 10)],
    ['28 y 31 a 10 y 20', dias(28, 31), dias(10, 20)],
    ['25 y 5 a 31 y 7', dias(25, 5), dias(31, 7)],
    ['10 y 20 a solo cierre', dias(10, 20), dias(10, null)],
    ['solo cierre a ~28 y ~2', dias(12, null), dias(28, 2, true)],
    ['5 y 25 a 28 y 1', dias(5, 25), dias(28, 1)],
  ];

  const ULTIMO_PASADO = '2026-09';

  function build(card: PaymentMethod): PersonalFacts {
    const movements = [];
    const expenses = [];
    const details = [];
    let date = '2026-01-02';
    let n = 0;
    while (date <= '2027-02-28') {
      n += 1;
      // En 1 pago, con tarjeta.
      movements.push(movement({ id: `u${n}`, amount: 10_000 + n, date, paymentMethodId: card.id }));
      // En cuotas, con tarjeta.
      movements.push(
        movement({
          id: `c${n}`,
          amount: 12_000 * (2 + (n % 5)) + 7,
          date,
          paymentMethodId: card.id,
          installments: { count: 2 + (n % 5), card },
        }),
      );
      // Un gasto compartido en 1 pago y otro en cuotas, que pagó el usuario con la tarjeta.
      const puntual = sharedExpense({ id: `sp${n}`, amount: 20_001, date, payerSlot: RENZO });
      const cuotas = sharedExpense({
        id: `sc${n}`,
        amount: 24_001,
        date,
        payerSlot: RENZO,
        installments: { count: 4, card },
      });
      expenses.push(puntual, cuotas);
      details.push(paidWith(puntual.id, RENZO, card.id), paidWith(cuotas.id, RENZO, card.id));
      date = addDays(date, 6);
    }

    const recurrences = [3, 17, 28, 31].map((day) =>
      personalRecurrence({
        id: `fijo${day}`,
        kind: 'expense',
        amount: 5_000 + day,
        dayOfMonth: day,
        startMonth: '2026-01',
        category: 'suscripciones',
        paymentMethodId: card.id,
      }),
    );
    const luz = sharedRecurrence({
      id: 'luz',
      amount: 30_000,
      dayOfMonth: 9,
      startMonth: '2026-01',
      payerSlot: RENZO,
    });
    details.push(paidWith(luz.id, RENZO, card.id));

    return personalFacts({
      paymentMethods: [card],
      movements,
      recurrences: [
        ...recurrences,
        personalRecurrence({
          kind: 'income',
          amount: 2_000_000,
          dayOfMonth: 5,
          startMonth: '2026-01',
          category: 'sueldo',
        }),
      ],
      spaces: [
        membership({
          facts: spaceFacts({ expenses, recurrences: [luz] }),
          mySlot: RENZO,
          paymentDetails: details,
        }),
      ],
    });
  }

  function applyWrites(facts: PersonalFacts, writes: readonly PlanWrite[], card: PaymentMethod) {
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

  /** Gastado, Comprometido, Sin asignar, el total de las ocurrencias y el resumen estimado de cada mes. */
  function snapshot(facts: PersonalFacts, months: string[]) {
    const expansion = expandPersonalOccurrences(facts, { from: '2025-12', to: '2028-06' });
    return months.map((month) => {
      const radar = radarForMonth(facts, month);
      return {
        month,
        spent: radar.spent,
        committed: radar.committed,
        unassigned: radar.unassigned,
        total: expansion.occurrences
          .filter((item) => item.month === month)
          .reduce((sum, item) => sum + item.total, 0),
        statement: estimatedStatement(expansion, visa.id, month).amount,
        // Las fechas de las compras en 1 pago y de los fijos. Una cuota guarda UN día de
        // impacto para todo su plan (F2): corregir el vencimiento mueve su día dentro del
        // mes, nunca el mes, y eso ya era así.
        dates: expansion.occurrences
          .filter((item) => item.month === month && item.installment == null)
          .map((item) => `${item.id}@${item.paymentDate}`)
          .sort(),
      };
    });
  }

  const meses = (from: string, to: string): string[] => {
    const out: string[] = [];
    for (let month = from; month <= to; month = addMonths(month, 1)) out.push(month);
    return out;
  };

  for (const [nombre, antes, ahora] of combinaciones) {
    it(`${nombre}: Gastado, Comprometido, Sin asignar y resúmenes de los meses pasados son idénticos`, () => {
      const before = tarjeta(antes);
      const facts = build(before);
      const after = changeCardDays(before, ahora, HOY);

      const plan = planCardDaysChange({ before, after, facts, today: HOY });
      const updated = applyWrites(facts, plan.writes, after);

      const pasados = meses('2025-12', ULTIMO_PASADO);
      expect(snapshot(updated, pasados)).toEqual(snapshot(facts, pasados));
    });
  }

  it('y lo que se paga de acá en adelante SÍ se mueve (la garantía de arriba no es vacía)', () => {
    const before = tarjeta(dias(25, 5));
    const facts = build(before);
    const after = changeCardDays(before, dias(3, 15), HOY);

    const plan = planCardDaysChange({ before, after, facts, today: HOY });
    const updated = applyWrites(facts, plan.writes, after);

    const futuros = meses('2026-10', '2027-06');
    expect(snapshot(updated, futuros)).not.toEqual(snapshot(facts, futuros));
  });

  it('con la historia, corregir los días nunca deja un pago pasado que se mueva', () => {
    for (const [, antes, ahora] of combinaciones) {
      const before = tarjeta(antes);
      const after = changeCardDays(before, ahora, HOY);
      const plan = planCardDaysChange({ before, after, facts: build(before), today: HOY });

      expect(plan.items.every((item) => item.before.month >= '2026-10')).toBe(true);
    }
  });
});
