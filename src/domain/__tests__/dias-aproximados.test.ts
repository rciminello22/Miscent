import { describe, it, expect } from 'vitest';
import { isCardDateApprox, resolveCardPayment } from '../cards';
import { calculateFuture } from '../future';
import { expandPersonalOccurrences } from '../occurrences';
import { calculateRadar } from '../radar';
import type { PaymentMethod } from '../types';
import { calculateUpcomingPayments } from '../upcoming';
import { movement, personalFacts, personalRecurrence } from './fixtures';

/**
 * T-02 · T-05 · "Sé el día", "Más o menos" y "No sé".
 *
 * El día aproximado ("Más o menos": 2, 15 o 28 con una marca) es un hecho más de
 * la tarjeta o del ingreso. Se calcula igual que un día exacto: la marca solo
 * decide cómo se MUESTRA la fecha ("~15 nov"). Un "No sé" sigue siendo T-05: se
 * muestra el mes y nunca se inventa un día.
 */

function card(args: {
  closingDay: number | null;
  dueDay: number | null;
  closingApprox?: boolean;
  dueApprox?: boolean;
}): PaymentMethod {
  return {
    id: 'visa',
    kind: 'card',
    name: 'Visa Galicia',
    closingDay: args.closingDay,
    dueDay: args.dueDay,
    closingApprox: args.closingApprox ?? false,
    dueApprox: args.dueApprox ?? false,
  };
}

describe('isCardDateApprox · cuándo la fecha de un resumen es "~"', () => {
  it('con los dos días exactos, la fecha es firme', () => {
    const visa = card({ closingDay: 25, dueDay: 5 });

    expect(isCardDateApprox(visa, resolveCardPayment(visa, '2026-10-20'))).toBe(false);
  });

  it('un vencimiento "Más o menos" hace aproximada la fecha', () => {
    const visa = card({ closingDay: 25, dueDay: 2, dueApprox: true });

    expect(isCardDateApprox(visa, resolveCardPayment(visa, '2026-10-20'))).toBe(true);
  });

  it('un cierre "Más o menos" también: el mes en que cae puede correrse', () => {
    const visa = card({ closingDay: 15, dueDay: 5, closingApprox: true });

    expect(isCardDateApprox(visa, resolveCardPayment(visa, '2026-10-20'))).toBe(true);
  });

  it('T-05 · sin día de vencimiento no hay fecha, y entonces no hay nada que marcar con "~"', () => {
    const visa = card({ closingDay: 15, dueDay: null, closingApprox: true });
    const schedule = resolveCardPayment(visa, '2026-10-20');

    expect(schedule.dueDate).toBeNull();
    expect(isCardDateApprox(visa, schedule)).toBe(false);
  });

  it('T-05 · "No sé" en las dos sigue mostrando el mes, sin "~"', () => {
    const visa = card({ closingDay: null, dueDay: null });
    const schedule = resolveCardPayment(visa, '2026-10-20');

    expect(schedule).toEqual({ month: '2026-11', dueDate: null, approximate: true });
    expect(isCardDateApprox(visa, schedule)).toBe(false);
  });

  it('T-05 · solo el vencimiento, "Más o menos": la fecha existe y es aproximada', () => {
    const visa = card({ closingDay: null, dueDay: 15, dueApprox: true });

    expect(isCardDateApprox(visa, resolveCardPayment(visa, '2026-10-20'))).toBe(true);
  });

  it('un día aproximado se calcula como cualquier día: Mediados es el 15', () => {
    const visa = card({ closingDay: 15, dueDay: 2, closingApprox: true, dueApprox: true });

    // Compra del 10/10: cierra el 15/10 y vence el 2/11.
    expect(resolveCardPayment(visa, '2026-10-10')).toEqual({
      month: '2026-11',
      dueDate: '2026-11-02',
      approximate: false,
    });
  });
});

describe('Próximos pagos · la marca "~" llega a cada pago', () => {
  const HOY = '2026-10-20';

  function pagos(visa: PaymentMethod) {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [movement({ amount: 120_000, date: '2026-10-07', paymentMethodId: visa.id })],
    });
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    return calculateUpcomingPayments(expansion, HOY, facts.paymentMethods);
  }

  it('un resumen con el vencimiento "Más o menos" lleva dateApprox y su fecha', () => {
    const [resumen] = pagos(card({ closingDay: 25, dueDay: 2, dueApprox: true }));

    expect(resumen!.date).toBe('2026-11-02');
    expect(resumen!.dateApprox).toBe(true);
  });

  it('con días exactos no lleva la marca', () => {
    const [resumen] = pagos(card({ closingDay: 25, dueDay: 5 }));

    expect(resumen!.dateApprox).toBe(false);
  });

  it('T-05 · con "No sé" muestra el mes (sin fecha) y no se disfraza de "~"', () => {
    const [resumen] = pagos(card({ closingDay: null, dueDay: null }));

    expect(resumen!.date).toBeNull();
    expect(resumen!.approximate).toBe(true);
    expect(resumen!.dateApprox).toBe(false);
  });

  it('un pago sin tarjeta nunca lleva la marca', () => {
    const facts = personalFacts({
      paymentMethods: [],
      recurrences: [
        personalRecurrence({
          kind: 'expense',
          amount: 300_000,
          dayOfMonth: 1,
          startMonth: '2026-10',
          category: 'alquiler',
        }),
      ],
    });
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    const pagosFijos = calculateUpcomingPayments(expansion, HOY, []);

    expect(pagosFijos.every((pago) => !pago.dateApprox)).toBe(true);
  });

  it('un fijo que se paga con una tarjeta de día aproximado hereda la marca', () => {
    const visa = card({ closingDay: 25, dueDay: 2, dueApprox: true });
    const facts = personalFacts({
      paymentMethods: [visa],
      recurrences: [
        personalRecurrence({
          kind: 'expense',
          amount: 9_000,
          dayOfMonth: 10,
          startMonth: '2026-10',
          category: 'suscripciones',
          paymentMethodId: visa.id,
        }),
      ],
    });
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    const [resumen] = calculateUpcomingPayments(expansion, HOY, facts.paymentMethods);

    expect(resumen!.kind).toBe('card-statement');
    expect(resumen!.dateApprox).toBe(true);
  });
});

describe('Ingresos · el día de cobro no mueve ningún total', () => {
  const hoy = '2026-10-20';
  const horizon = { from: '2026-10', to: '2027-02' };

  function totals(dayOfMonth: number | null, dayApprox = false) {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          id: 'sueldo',
          kind: 'income',
          amount: 1_200_000,
          dayOfMonth,
          dayApprox,
          startMonth: '2026-08',
          category: 'sueldo',
        }),
        personalRecurrence({
          id: 'alquiler',
          kind: 'expense',
          amount: 300_000,
          dayOfMonth: 1,
          startMonth: '2026-08',
          category: 'alquiler',
        }),
      ],
    });
    const expansion = expandPersonalOccurrences(facts, horizon);
    return {
      radar: calculateRadar(expansion, '2026-10'),
      future: calculateFuture(expansion, '2026-11', 4).months,
      upcoming: calculateUpcomingPayments(expansion, hoy),
    };
  }

  it('cobrar el 5, "más o menos" el 28 o "No sé" da exactamente los mismos totales', () => {
    const exacto = totals(5);

    expect(totals(28, true)).toEqual(exacto);
    expect(totals(null)).toEqual(exacto);
  });

  it('"No sé" cuenta el ingreso en el mes en que se cobra, sin día', () => {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          kind: 'income',
          amount: 1_200_000,
          dayOfMonth: null,
          startMonth: '2026-10',
          category: 'sueldo',
        }),
      ],
    });
    const { incomes } = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-11' });

    expect(incomes.map((income) => income.month)).toEqual(['2026-10', '2026-11']);
    expect(incomes.every((income) => income.date === null)).toBe(true);
    expect(calculateRadar({ occurrences: [], incomes }, '2026-10').registeredIncome).toBe(1_200_000);
  });
});
