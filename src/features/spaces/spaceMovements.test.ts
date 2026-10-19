import { describe, it, expect } from 'vitest';
import type { SpaceOccurrence } from '@domain/occurrences';
import type { MemberPayment } from '@domain/types';
import {
  authorshipLine,
  buildSpaceMovements,
  dayHeading,
  groupMovementsByDay,
  movementsDoorCaption,
  occurrenceFigures,
  PAYMENT_CAPTION,
  paymentAuthorshipLine,
  paymentDirectionOf,
  paymentRowTitle,
  paymentTitle,
  taggedOccurrenceIds,
} from './spaceMovements';

const TODAY = '2026-10-15';

function occurrence(id: string, balanceDate: string, sourceId = id): SpaceOccurrence {
  return {
    id,
    sourceId,
    sourceKind: 'expense',
    label: id,
    category: 'supermercado',
    amount: 100,
    shares: { slot1: 50, slot2: 50 },
    payerSlot: 1,
    balanceDate,
    month: balanceDate.slice(0, 7),
    installment: null,
    isRecurrence: false,
  };
}

function payment(id: string, date: string, fromSlot: 1 | 2 = 2): MemberPayment {
  return {
    id,
    spaceId: 's',
    fromSlot,
    toSlot: fromSlot === 1 ? 2 : 1,
    amount: 30,
    date,
    recordedBySlot: fromSlot,
    createdAt: '2026-10-08T10:00:00Z',
  };
}

describe('buildSpaceMovements · gastos Y pagos, por fecha, solo lo que ya pasó', () => {
  it('junta gastos y pagos, del más reciente al más viejo', () => {
    const movements = buildSpaceMovements({
      occurrences: [occurrence('a', '2026-10-02'), occurrence('c', '2026-10-12')],
      payments: [payment('p', '2026-10-08')],
      today: TODAY,
    });
    expect(movements.map((m) => m.date)).toEqual(['2026-10-12', '2026-10-08', '2026-10-02']);
    expect(movements.map((m) => m.kind)).toEqual(['occurrence', 'payment', 'occurrence']);
  });

  it('lo que viene queda afuera, igual que en el saldo (S-02): hoy sí, mañana no', () => {
    const movements = buildSpaceMovements({
      occurrences: [occurrence('hoy', TODAY), occurrence('manana', '2026-10-16')],
      payments: [payment('futuro', '2026-10-20')],
      today: TODAY,
    });
    expect(movements.map((m) => m.date)).toEqual([TODAY]);
  });

  it('con la misma fecha respeta el orden de entrada', () => {
    const movements = buildSpaceMovements({
      occurrences: [occurrence('a', '2026-10-12'), occurrence('b', '2026-10-12')],
      payments: [],
      today: TODAY,
    });
    expect(movements.map((m) => (m.kind === 'occurrence' ? m.occurrence.id : ''))).toEqual(['a', 'b']);
  });
});

describe('taggedOccurrenceIds · la marca va UNA vez por registro', () => {
  it('un fijo tiene una ocurrencia por mes: solo la más reciente lleva la marca', () => {
    const movements = buildSpaceMovements({
      occurrences: [
        occurrence('alq-sep', '2026-09-05', 'alquiler'),
        occurrence('alq-oct', '2026-10-05', 'alquiler'),
        occurrence('super', '2026-10-10', 'super'),
      ],
      payments: [],
      today: TODAY,
    });
    const tagged = taggedOccurrenceIds(movements, new Set(['alquiler']));
    expect([...tagged]).toEqual(['alq-oct']);
  });

  it('lo que no está para revisar no se marca', () => {
    const movements = buildSpaceMovements({
      occurrences: [occurrence('x', '2026-10-10')],
      payments: [],
      today: TODAY,
    });
    expect(taggedOccurrenceIds(movements, new Set()).size).toBe(0);
  });

  it('los pagos no cuentan: se marcan por su propio id', () => {
    const movements = buildSpaceMovements({
      occurrences: [],
      payments: [payment('p', '2026-10-08')],
      today: TODAY,
    });
    expect(taggedOccurrenceIds(movements, new Set(['p'])).size).toBe(0);
  });
});

describe('groupMovementsByDay', () => {
  it('agrupa por día conservando el orden', () => {
    const movements = buildSpaceMovements({
      occurrences: [
        occurrence('a', '2026-10-12'),
        occurrence('b', '2026-10-12'),
        occurrence('c', '2026-10-02'),
      ],
      payments: [payment('p', '2026-10-08')],
      today: TODAY,
    });
    const groups = groupMovementsByDay(movements);
    expect(groups.map((group) => group.date)).toEqual(['2026-10-12', '2026-10-08', '2026-10-02']);
    expect(groups.map((group) => group.movements.length)).toEqual([2, 1, 1]);
  });

  it('sin movimientos, sin grupos', () => {
    expect(groupMovementsByDay([])).toEqual([]);
  });
});

describe('dayHeading', () => {
  it('hoy y ayer, con esas palabras', () => {
    expect(dayHeading('2026-10-15', TODAY)).toBe('Hoy');
    expect(dayHeading('2026-10-14', TODAY)).toBe('Ayer');
  });

  it('antes de ayer, la fecha en palabras', () => {
    expect(dayHeading('2026-10-08', TODAY)).toBe('8 de octubre');
  });

  it('de otro año, con el año', () => {
    expect(dayHeading('2025-12-30', TODAY)).toBe('30 de diciembre de 2025');
  });
});

describe('movementsDoorCaption · "12 · último: Supermercado, hoy"', () => {
  it('cuenta y último movimiento, con hoy y ayer en palabras', () => {
    expect(
      movementsDoorCaption({ count: 12, last: { label: 'Supermercado', date: TODAY }, today: TODAY }),
    ).toBe('12 · último: Supermercado, hoy');
    expect(
      movementsDoorCaption({ count: 5, last: { label: 'Super', date: '2026-10-14' }, today: TODAY }),
    ).toBe('5 · último: Super, ayer');
  });

  it('más viejo, con la fecha corta', () => {
    expect(
      movementsDoorCaption({ count: 3, last: { label: 'Internet', date: '2026-10-08' }, today: TODAY }),
    ).toBe('3 · último: Internet, 8 oct');
  });

  it('sin movimientos, sin último', () => {
    expect(movementsDoorCaption({ count: 0, last: null, today: TODAY })).toBe('Todavía no hay movimientos');
  });
});

describe('paymentTitle', () => {
  it('"Pago de Martina" o "Tu pago", sin signos de deuda', () => {
    expect(paymentTitle(payment('p', TODAY, 2), 1, 'Martina')).toBe('Pago de Martina');
    expect(paymentTitle(payment('p', TODAY, 1), 1, 'Martina')).toBe('Tu pago');
  });
});

describe('15 · un pago en la lista del espacio: el título sin cifra y la dirección de quien mira', () => {
  it('"Martina te pagó" / "Le pagaste a Martina": la cifra va aparte, con su signo', () => {
    expect(paymentRowTitle(payment('p', TODAY, 2), 1, 'Martina')).toBe('Martina te pagó');
    expect(paymentRowTitle(payment('p', TODAY, 1), 1, 'Martina')).toBe('Le pagaste a Martina');
  });

  it('la dirección es la de quien mira: el mismo pago lo ve el otro al revés', () => {
    expect(paymentDirectionOf(payment('p', TODAY, 2), 1)).toBe('received');
    expect(paymentDirectionOf(payment('p', TODAY, 1), 1)).toBe('sent');
    expect(paymentDirectionOf(payment('p', TODAY, 2), 2)).toBe('sent');
    expect(paymentDirectionOf(payment('p', TODAY, 1), 2)).toBe('received');
  });

  it('la segunda línea es la misma en todos lados: "Entre ustedes · no cambia tu radar"', () => {
    expect(PAYMENT_CAPTION).toBe('Entre ustedes · no cambia tu radar');
  });
});

describe('15 · un gasto en la lista del espacio: tu parte arriba, el total en gris', () => {
  it('50/50: −$50.000 de $100.000', () => {
    expect(occurrenceFigures({ ...occurrence('a', TODAY), amount: 100_000, shares: { slot1: 50_000, slot2: 50_000 } }, 1)).toEqual({
      amount: 50_000,
      ofTotal: 100_000,
    });
  });

  it('es TU parte aunque haya pagado el otro, y se lee según tu lugar', () => {
    const luz = { ...occurrence('luz', TODAY), amount: 45_000, shares: { slot1: 22_500, slot2: 22_500 }, payerSlot: 2 as const };
    expect(occurrenceFigures(luz, 1).amount).toBe(22_500);

    const custom = { ...occurrence('c', TODAY), amount: 100_000, shares: { slot1: 30_000, slot2: 70_000 } };
    expect(occurrenceFigures(custom, 1).amount).toBe(30_000);
    expect(occurrenceFigures(custom, 2).amount).toBe(70_000);
  });

  it('si tu parte es el total, no repite "de $X"', () => {
    const all = { ...occurrence('a', TODAY), amount: 100, shares: { slot1: 100, slot2: 0 } };
    expect(occurrenceFigures(all, 1)).toEqual({ amount: 100, ofTotal: null });
  });
});

describe('authorshipLine · K3 · quién cargó y quién editó', () => {
  it('lo cargaste vos', () => {
    expect(authorshipLine({ createdBySlot: 1, updatedBySlot: 1 }, 1, 'Martina')).toBe('Lo cargaste vos');
  });

  it('lo cargó el otro', () => {
    expect(authorshipLine({ createdBySlot: 2, updatedBySlot: 2 }, 1, 'Martina')).toBe('Lo cargó Martina');
  });

  it('si lo editó otra persona, lo dice', () => {
    expect(authorshipLine({ createdBySlot: 1, updatedBySlot: 2 }, 1, 'Martina')).toBe(
      'Lo cargaste vos · lo editó Martina',
    );
    expect(authorshipLine({ createdBySlot: 2, updatedBySlot: 1 }, 1, 'Martina')).toBe(
      'Lo cargó Martina · lo editaste vos',
    );
  });

  it('sin saber quién lo cargó no se inventa', () => {
    expect(authorshipLine({ createdBySlot: null, updatedBySlot: null }, 1, 'Martina')).toBeNull();
    expect(authorshipLine({ createdBySlot: null, updatedBySlot: 2 }, 1, 'Martina')).toBeNull();
  });
});

describe('paymentAuthorshipLine', () => {
  it('quién lo registró', () => {
    expect(paymentAuthorshipLine(1, 1, 'Martina')).toBe('Lo registraste vos');
    expect(paymentAuthorshipLine(2, 1, 'Martina')).toBe('Lo registró Martina');
  });
});
