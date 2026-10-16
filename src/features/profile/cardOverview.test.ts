import { describe, it, expect } from 'vitest';
import {
  declaredStatement,
  movement,
  personalFacts,
  personalRecurrence,
  visa,
  mastercard,
} from '@domain/__tests__/fixtures';
import { expandPersonalOccurrences } from '@domain/occurrences';
import { calculateUpcomingPayments } from '@domain/upcoming';
import type { PersonalFacts } from '@domain/types';
import { formatPesos } from '@/lib/format';
import {
  cardDayPills,
  cardDoorLine,
  cardGroup,
  cardGroupDoors,
  cardRetention,
  cardStatements,
  deleteConfirmation,
  retentionLines,
  statementBars,
} from './cardOverview';

/**
 * Tarjetas desde Perfil (P24, §22). TS puro: la lista, el detalle y la regla de
 * cuándo se puede eliminar una tarjeta salen de acá.
 *
 * La tarjeta es un medio para organizar compromisos, no una cuenta (T-01): acá
 * nunca hay número, límite, pago mínimo ni intereses.
 */

const HOY = '2026-10-20';
const horizon = { from: '2026-09', to: '2027-03' };

function compute(facts: PersonalFacts, today = HOY) {
  const expansion = expandPersonalOccurrences(facts, horizon);
  const payments = calculateUpcomingPayments(expansion, today, facts.paymentMethods);
  return { expansion, payments, retention: cardRetention(facts, expansion, visa.id, today) };
}

describe('cardStatements · los próximos resúmenes de UNA tarjeta', () => {
  it('solo los de esa tarjeta, desde hoy y en orden', () => {
    const facts = personalFacts({
      paymentMethods: [visa, mastercard],
      movements: [
        movement({ amount: 40_000, date: '2026-10-07', paymentMethodId: visa.id }),
        movement({ amount: 25_000, date: '2026-11-07', paymentMethodId: visa.id }),
        movement({ amount: 10_000, date: '2026-10-08', paymentMethodId: mastercard.id }),
      ],
    });
    const { payments } = compute(facts);

    const statements = cardStatements(payments, visa.id, HOY);

    expect(statements.map((statement) => statement.month)).toEqual(['2026-11', '2026-12']);
    expect(statements.every((statement) => statement.cardId === visa.id)).toBe(true);
  });

  it('sin compras con esa tarjeta, ninguno', () => {
    const { payments } = compute(personalFacts({ paymentMethods: [visa], movements: [] }));

    expect(cardStatements(payments, visa.id, HOY)).toEqual([]);
  });
});

describe('cardDoorLine · la puerta de cada tarjeta en la lista', () => {
  it('el próximo resumen, con su fecha y rotulado como estimado (N-10)', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [movement({ amount: 120_000, date: '2026-10-07', paymentMethodId: visa.id })],
    });
    const [next] = cardStatements(compute(facts).payments, visa.id, HOY);

    expect(cardDoorLine(next ?? null, formatPesos)).toBe('5 nov · resumen estimado · $120.000');
  });

  it('T-02 · una fecha de "Más o menos" lleva "~" y "(aprox.)"', () => {
    const aprox = { ...visa, dueDay: 2, dueApprox: true };
    const facts = personalFacts({
      paymentMethods: [aprox],
      movements: [movement({ amount: 120_000, date: '2026-10-07', paymentMethodId: aprox.id })],
    });
    const [next] = cardStatements(compute(facts).payments, aprox.id, HOY);

    expect(cardDoorLine(next ?? null, formatPesos)).toBe(
      '~2 nov · resumen estimado (aprox.) · $120.000',
    );
  });

  it('T-05 · sin día se dice el mes, sin inventar una fecha', () => {
    const sinDias = { ...visa, closingDay: null, dueDay: null };
    const facts = personalFacts({
      paymentMethods: [sinDias],
      movements: [movement({ amount: 80_000, date: '2026-10-07', paymentMethodId: sinDias.id })],
    });
    const [next] = cardStatements(compute(facts).payments, sinDias.id, HOY);

    expect(cardDoorLine(next ?? null, formatPesos)).toBe('noviembre · resumen estimado · $80.000');
  });

  it('sin resumen por venir lo dice, sin alarma', () => {
    expect(cardDoorLine(null, formatPesos)).toBe('Sin resumen por venir');
  });
});

describe('statementBars · las barras de los próximos 4 vencimientos', () => {
  it('una por resumen, hasta 4, proporcionales al mayor', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [
        movement({ amount: 100_000, date: '2026-10-07', paymentMethodId: visa.id }),
        movement({ amount: 50_000, date: '2026-11-07', paymentMethodId: visa.id }),
        movement({ amount: 25_000, date: '2026-12-07', paymentMethodId: visa.id }),
        movement({ amount: 10_000, date: '2027-01-07', paymentMethodId: visa.id }),
        movement({ amount: 10_000, date: '2027-02-07', paymentMethodId: visa.id }),
      ],
    });
    const bars = statementBars(cardStatements(compute(facts).payments, visa.id, HOY), 4);

    expect(bars.map((bar) => bar.month)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(bars.map((bar) => bar.ratio)).toEqual([1, 0.5, 0.25, 0.1]);
  });

  it('sin resúmenes, sin barras', () => {
    expect(statementBars([], 4)).toEqual([]);
  });
});

describe('cardGroupDoors · Compras, Cuotas y Fijos de la tarjeta', () => {
  it('cuenta lo que hay en cada puerta y omite las vacías', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [
        movement({ amount: 40_000, date: '2026-10-07', paymentMethodId: visa.id }),
        movement({
          amount: 90_000,
          date: '2026-10-08',
          paymentMethodId: visa.id,
          installments: { count: 3, card: visa },
        }),
      ],
    });
    const doors = cardGroupDoors(cardStatements(compute(facts).payments, visa.id, HOY));

    expect(doors.map((door) => [door.kind, door.count])).toEqual([
      ['purchase', 1],
      ['installment', 3],
    ]);
  });
});

describe('cardGroup · el detalle de una puerta', () => {
  it('las líneas de esa puerta, de todos los resúmenes, y nada más', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [
        movement({ amount: 40_000, date: '2026-10-07', paymentMethodId: visa.id }),
        movement({
          amount: 90_000,
          date: '2026-10-08',
          paymentMethodId: visa.id,
          installments: { count: 3, card: visa },
        }),
      ],
    });
    const statements = cardStatements(compute(facts).payments, visa.id, HOY);
    const group = cardGroup(statements, 'installment');

    expect(group?.lines).toHaveLength(3);
    expect(group?.subtotal).toBe(90_000);
    expect(cardGroup(statements, 'fixed')).toBeNull();
  });
});

describe('cardRetention · P24 · cuándo se puede eliminar una tarjeta', () => {
  it('sin nada por venir se puede eliminar', () => {
    const { retention } = compute(personalFacts({ paymentMethods: [visa] }));

    expect(retention).toEqual({ retained: false, reasons: [] });
  });

  it('una compra cuyo resumen todavía no venció la retiene, hasta ese mes', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [movement({ amount: 40_000, date: '2026-10-07', paymentMethodId: visa.id })],
    });

    expect(compute(facts).retention.reasons).toEqual([
      { kind: 'purchases', count: 1, untilMonth: '2026-11' },
    ]);
  });

  it('una compra de un resumen que ya venció, en un mes pasado, no la retiene', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [movement({ amount: 40_000, date: '2026-08-07', paymentMethodId: visa.id })],
    });

    expect(compute(facts).retention.retained).toBe(false);
  });

  it('un resumen que vence este mismo mes sigue contando hasta fin de mes: los meses pasados no cambian', () => {
    // Compra del 20/9: cierra el 25/9 y vence el 5/10. Hoy es 20/10, ya pasó,
    // pero sigue siendo parte de octubre.
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [movement({ amount: 40_000, date: '2026-09-20', paymentMethodId: visa.id })],
    });

    expect(compute(facts).retention.reasons).toEqual([
      { kind: 'purchases', count: 1, untilMonth: '2026-10' },
    ]);
  });

  it('las cuotas pendientes la retienen hasta la última', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      movements: [
        movement({
          amount: 90_000,
          date: '2026-10-08',
          paymentMethodId: visa.id,
          installments: { count: 3, card: visa },
        }),
      ],
    });

    expect(compute(facts).retention.reasons).toEqual([
      { kind: 'installments', plans: 1, untilMonth: '2027-01' },
    ]);
  });

  it('un fijo activo con esa tarjeta la retiene; uno que ya terminó, no', () => {
    const activo = personalRecurrence({
      kind: 'expense',
      amount: 9_000,
      dayOfMonth: 10,
      startMonth: '2026-01',
      category: 'suscripciones',
      description: 'Netflix',
      paymentMethodId: visa.id,
    });
    const terminado = personalRecurrence({
      kind: 'expense',
      amount: 5_000,
      dayOfMonth: 10,
      startMonth: '2026-01',
      endMonth: '2026-06',
      category: 'suscripciones',
      description: 'Viejo',
      paymentMethodId: visa.id,
    });
    const facts = personalFacts({ paymentMethods: [visa], recurrences: [activo, terminado] });
    const { retention } = compute(facts);

    expect(retention.reasons.find((reason) => reason.kind === 'fixed')).toEqual({
      kind: 'fixed',
      labels: ['Netflix'],
    });
  });

  it('un resumen pendiente declarado que todavía no venció la retiene', () => {
    const facts = personalFacts({
      paymentMethods: [visa],
      declaredStatements: [
        declaredStatement({ paymentMethodId: visa.id, amount: 70_000, dueDate: '2026-11-05' }),
      ],
    });

    expect(compute(facts).retention.reasons).toEqual([{ kind: 'statement', untilMonth: '2026-11' }]);
  });

  it('lo de otra tarjeta no cuenta', () => {
    const facts = personalFacts({
      paymentMethods: [visa, mastercard],
      movements: [movement({ amount: 10_000, date: '2026-10-08', paymentMethodId: mastercard.id })],
    });

    expect(compute(facts).retention.retained).toBe(false);
  });
});

describe('retentionLines · qué la retiene y hasta cuándo', () => {
  it('lo dice con palabras, una línea por motivo', () => {
    const lines = retentionLines(
      [
        { kind: 'purchases', count: 2, untilMonth: '2026-11' },
        { kind: 'installments', plans: 1, untilMonth: '2027-01' },
        { kind: 'fixed', labels: ['Netflix', 'Spotify'] },
        { kind: 'statement', untilMonth: '2026-11' },
      ],
      '2026-10',
    );

    expect(lines).toEqual([
      'Tiene 2 compras en un resumen que todavía no venció, hasta noviembre.',
      'Tiene 1 compra en cuotas, hasta enero de 2027.',
      'Tiene fijos activos: Netflix, Spotify.',
      'Tiene un resumen pendiente que declaraste, hasta noviembre.',
    ]);
  });

  it('singular de una compra', () => {
    expect(retentionLines([{ kind: 'purchases', count: 1, untilMonth: '2026-11' }], '2026-10')).toEqual([
      'Tiene 1 compra en un resumen que todavía no venció, hasta noviembre.',
    ]);
  });
});

describe('cardDayPills · el cierre y el vencimiento en la cabecera', () => {
  it('días exactos: sin marca', () => {
    expect(cardDayPills(visa)).toEqual(['Cierra el 25', 'Vence el 5']);
  });

  it('T-02 · un día de "Más o menos" lleva "~" y "aprox."', () => {
    expect(cardDayPills({ ...visa, closingDay: 15, closingApprox: true })).toEqual([
      'Cierra el ~15 · aprox.',
      'Vence el 5',
    ]);
  });

  it('T-05 · "No sé" no inventa un día', () => {
    expect(cardDayPills({ ...visa, closingDay: null, dueDay: null })).toEqual([
      'Cierre sin dato',
      'Vencimiento sin dato',
    ]);
  });
});

describe('deleteConfirmation', () => {
  it('dice qué pasa con lo pasado, con el nombre de la tarjeta', () => {
    expect(deleteConfirmation('Visa Galicia')).toEqual({
      title: '¿Eliminar Visa Galicia?',
      message: 'Sus compras pasadas quedan en Movimientos, sin tarjeta. Tus meses pasados no cambian.',
    });
  });
});
