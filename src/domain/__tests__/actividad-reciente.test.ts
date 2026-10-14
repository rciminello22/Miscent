/**
 * Should 6 · actividad reciente del espacio: quién cargó, editó o eliminó
 * qué, y cuándo. Sale de los hechos que ya existen (autoría K3, fechas que
 * pone el servidor y el rastro de lo eliminado): no hay un registro aparte.
 */

import { describe, it, expect } from 'vitest';
import { recentActivity } from '../activity';
import type { DeletedRecord } from '../types';
import { MARTINA, RENZO, memberPayment, sharedExpense, sharedRecurrence, spaceFacts } from './fixtures';

const at = (iso: string) => `${iso}+00:00`;

describe('actividad reciente del espacio', () => {
  const superMartina = {
    ...sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-05', payerSlot: MARTINA }),
    createdAt: at('2026-10-05T10:00:00'),
    updatedAt: at('2026-10-05T10:00:00'),
  };

  it('un gasto cargado', () => {
    const events = recentActivity(spaceFacts({ expenses: [superMartina] }), []);
    expect(events).toEqual([
      expect.objectContaining({ verb: 'created', kind: 'expense', bySlot: MARTINA, at: at('2026-10-05T10:00:00'), amount: 100_000 }),
    ]);
  });

  it('uno editado después: el alta y la edición, la más reciente primero', () => {
    const editado = { ...superMartina, updatedBySlot: RENZO, updatedAt: at('2026-10-06T09:00:00') };
    const events = recentActivity(spaceFacts({ expenses: [editado] }), []);
    expect(events.map((event) => [event.verb, event.bySlot])).toEqual([
      ['edited', RENZO],
      ['created', MARTINA],
    ]);
  });

  it('un pago registrado y un fijo cargado', () => {
    const pago = { ...memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-07' }), createdAt: at('2026-10-07T08:00:00') };
    const luz = {
      ...sharedRecurrence({ amount: 40_000, dayOfMonth: 15, startMonth: '2026-10', payerSlot: RENZO }),
      createdBySlot: RENZO,
      createdAt: at('2026-10-01T08:00:00'),
      updatedAt: at('2026-10-01T08:00:00'),
    };
    const events = recentActivity(spaceFacts({ payments: [pago], recurrences: [luz] }), []);
    expect(events.map((event) => event.kind)).toEqual(['payment', 'recurrence']);
  });

  it('un fijo de antes, sin autor conocido, no aparece: no se inventa quién', () => {
    const viejo = sharedRecurrence({ amount: 40_000, dayOfMonth: 15, startMonth: '2026-01', payerSlot: RENZO });
    expect(recentActivity(spaceFacts({ recurrences: [viejo] }), [])).toEqual([]);
  });

  it('lo eliminado, con su rastro', () => {
    const borrado: DeletedRecord = {
      sourceId: 'x',
      kind: 'expense',
      deletedBySlot: MARTINA,
      deletedAt: at('2026-10-08T10:00:00'),
      amount: 5_000,
      occurredOn: '2026-10-02',
      category: 'farmacia',
      description: null,
      fromSlot: null,
      createdBySlot: MARTINA,
      recordCreatedAt: at('2026-10-02T10:00:00'),
    };
    expect(recentActivity(spaceFacts({}), [borrado])[0]).toEqual(
      expect.objectContaining({ verb: 'deleted', bySlot: MARTINA, amount: 5_000, category: 'farmacia' }),
    );
  });

  it('corta en el límite', () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      ...sharedExpense({ amount: 1_000 + index, date: '2026-10-05', payerSlot: RENZO }),
      createdAt: at(`2026-10-05T10:${String(index).padStart(2, '0')}:00`),
      updatedAt: at(`2026-10-05T10:${String(index).padStart(2, '0')}:00`),
    }));
    expect(recentActivity(spaceFacts({ expenses: many }), [], 20)).toHaveLength(20);
  });
});
