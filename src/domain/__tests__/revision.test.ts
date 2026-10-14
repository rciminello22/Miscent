/**
 * Revisión de lo que carga el otro (opción B, 14/10).
 *
 * Lo que carga Martina cuenta enseguida y es igual para los dos. Lo único que
 * cambia es que Renzo lo ve "para revisar" hasta que lo mira: visibilidad, no
 * un permiso (K3 sigue igual).
 */

import { describe, it, expect } from 'vitest';
import { pendingReview } from '../review';
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
