/**
 * Revisión de lo que carga el otro (opción B, 14/10).
 *
 * Lo que carga Martina cuenta enseguida y es igual para los dos. Lo único que
 * cambia es que Renzo lo ve "para revisar" hasta que lo mira: visibilidad, no
 * un permiso (K3 sigue igual).
 */

import { describe, it, expect } from 'vitest';
import { pendingDeletions, pendingReview } from '../review';
import type { DeletedRecord } from '../types';
import { MARTINA, RENZO, memberPayment, sharedExpense, sharedRecurrence, spaceFacts } from './fixtures';

const delSuper = {
  ...sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-10', payerSlot: MARTINA }),
  createdBySlot: MARTINA,
  updatedBySlot: MARTINA,
  updatedAt: '2026-10-10T15:00:00+00:00',
};

describe('qué queda para revisar', () => {
  it('un gasto que cargó el otro, sin revisar', () => {
    const pending = pendingReview(spaceFacts({ expenses: [delSuper] }), RENZO, []);
    expect([...pending]).toEqual(['super']);
  });

  it('una vez revisado, ya no', () => {
    const pending = pendingReview(spaceFacts({ expenses: [delSuper] }), RENZO, [
      { sourceId: 'super', reviewedAt: '2026-10-10T16:00:00+00:00' },
    ]);
    expect(pending.size).toBe(0);
  });

  it('si el otro lo edita DESPUÉS de revisarlo, vuelve a quedar para revisar', () => {
    const editado = { ...delSuper, updatedAt: '2026-10-11T09:00:00+00:00' };
    const pending = pendingReview(spaceFacts({ expenses: [editado] }), RENZO, [
      { sourceId: 'super', reviewedAt: '2026-10-10T16:00:00+00:00' },
    ]);
    expect([...pending]).toEqual(['super']);
  });

  it('lo que cargó o editó uno mismo nunca es para revisar', () => {
    const editadoPorRenzo = { ...delSuper, updatedBySlot: RENZO };
    const pending = pendingReview(spaceFacts({ expenses: [editadoPorRenzo] }), RENZO, []);
    expect(pending.size).toBe(0);
  });

  it('un fijo compartido que cargó el otro', () => {
    const luz = { ...sharedRecurrence({ id: 'luz', amount: 40_000, dayOfMonth: 15, startMonth: '2026-10', payerSlot: MARTINA }), createdBySlot: MARTINA };
    const pending = pendingReview(spaceFacts({ recurrences: [luz] }), RENZO, []);
    expect([...pending]).toEqual(['luz']);
  });

  it('§21 · si el otro edita un fijo DESPUÉS de revisarlo, vuelve a quedar para revisar', () => {
    const luz = {
      ...sharedRecurrence({ id: 'luz', amount: 40_000, dayOfMonth: 15, startMonth: '2026-10', payerSlot: RENZO }),
      createdBySlot: RENZO,
      updatedBySlot: MARTINA,
      updatedAt: '2026-10-12T09:00:00+00:00',
    };
    const pending = pendingReview(spaceFacts({ recurrences: [luz] }), RENZO, [
      { sourceId: 'luz', reviewedAt: '2026-10-11T09:00:00+00:00' },
    ]);
    expect([...pending]).toEqual(['luz']);
  });

  it('§21 · un fijo del otro que edité yo después, ya lo vi', () => {
    const luz = {
      ...sharedRecurrence({ id: 'luz', amount: 40_000, dayOfMonth: 15, startMonth: '2026-10', payerSlot: MARTINA }),
      createdBySlot: MARTINA,
      updatedBySlot: RENZO,
    };
    expect(pendingReview(spaceFacts({ recurrences: [luz] }), RENZO, []).size).toBe(0);
  });

  it('un fijo sin autor conocido (de antes) no se marca: no se inventa quién lo cargó', () => {
    const viejo = { ...sharedRecurrence({ id: 'viejo', amount: 40_000, dayOfMonth: 15, startMonth: '2026-10', payerSlot: MARTINA }), createdBySlot: null };
    const pending = pendingReview(spaceFacts({ recurrences: [viejo] }), RENZO, []);
    expect(pending.size).toBe(0);
  });

  it('un pago que registró el otro', () => {
    const pago = {
      ...memberPayment({ amount: 20_000, date: '2026-10-12', fromSlot: MARTINA, toSlot: RENZO }),
      id: 'pago',
      recordedBySlot: MARTINA,
    };
    const pending = pendingReview(spaceFacts({ payments: [pago] }), RENZO, []);
    expect([...pending]).toEqual(['pago']);
  });
});

/**
 * Lo que ELIMINA el otro. Un registro borrado no puede llevar la marca, así
 * que la lleva su rastro (deleted_shared_records): "Martina eliminó
 * Supermercado · $100.000".
 */
describe('qué eliminó el otro y queda para revisar', () => {
  const borrado = (overrides: Partial<DeletedRecord> = {}): DeletedRecord => ({
    sourceId: 'super',
    kind: 'expense',
    deletedBySlot: MARTINA,
    deletedAt: '2026-10-12T10:00:00+00:00',
    amount: 100_000,
    occurredOn: '2026-10-05',
    category: 'supermercado',
    description: 'Supermercado',
    fromSlot: null,
    createdBySlot: RENZO,
    recordCreatedAt: '2026-10-05T12:00:00+00:00',
    ...overrides,
  });

  it('lo que eliminó el otro, sin revisar', () => {
    expect(pendingDeletions([borrado()], RENZO, []).map((item) => item.sourceId)).toEqual(['super']);
  });

  it('lo que eliminé yo, nunca', () => {
    expect(pendingDeletions([borrado({ deletedBySlot: RENZO })], RENZO, [])).toEqual([]);
  });

  it('revisado después de eliminarlo, ya no', () => {
    const reviews = [{ sourceId: 'super', reviewedAt: '2026-10-12T11:00:00+00:00' }];
    expect(pendingDeletions([borrado()], RENZO, reviews)).toEqual([]);
  });

  it('revisado ANTES de eliminarlo (cuando existía), sigue para revisar: la eliminación es otro cambio', () => {
    const reviews = [{ sourceId: 'super', reviewedAt: '2026-10-06T09:00:00+00:00' }];
    expect(pendingDeletions([borrado()], RENZO, reviews)).toHaveLength(1);
  });

  it('si lo cargó y lo borró enseguida quien lo eliminó (Deshacer), no hay nada que revisar', () => {
    const deshecho = borrado({
      createdBySlot: MARTINA,
      recordCreatedAt: '2026-10-12T09:58:00+00:00',
    });
    expect(pendingDeletions([deshecho], RENZO, [])).toEqual([]);
  });

  it('si lo había cargado ella hace días, sí: el saldo que Renzo vio cambió', () => {
    const viejo = borrado({ createdBySlot: MARTINA, recordCreatedAt: '2026-10-05T12:00:00+00:00' });
    expect(pendingDeletions([viejo], RENZO, [])).toHaveLength(1);
  });

  it('un rastro de antes, sin lo que era, no se muestra: no se inventa', () => {
    expect(pendingDeletions([borrado({ amount: null })], RENZO, [])).toEqual([]);
  });

  it('lo más reciente primero', () => {
    const pagos = borrado({ sourceId: 'pago', kind: 'payment', deletedAt: '2026-10-13T10:00:00+00:00' });
    expect(pendingDeletions([borrado(), pagos], RENZO, []).map((item) => item.sourceId)).toEqual([
      'pago',
      'super',
    ]);
  });
});
