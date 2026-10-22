import { describe, expect, it } from 'vitest';
import { RENZO, casa, memberPayment, sharedExpense, sharedRecurrence, spaceFacts } from '@domain/__tests__/fixtures';
import type { Member } from '@domain/types';
import { leaveDeletesSpace, leaveDeletionCopy } from './leaveConsequences';

const martina = (status: Member['status']): Member => ({
  slot: 2,
  userId: status === 'active' ? 'user-2' : null,
  displayName: 'Martina',
  status,
  isCreator: false,
});
const renzo: Member = { slot: 1, userId: 'user-1', displayName: 'Renzo', status: 'active', isCreator: true };

const withOther = (status: Member['status']) =>
  spaceFacts({ space: casa({ members: [renzo, martina(status)] }) });

describe('leaveDeletesSpace · H-07, SA-06', () => {
  it('Modo 1 (el otro nunca entró): salir elimina el espacio', () => {
    expect(leaveDeletesSpace(withOther('no_access'), RENZO)).toBe(true);
  });

  it('el otro ya es ex miembro: también queda vacío', () => {
    expect(leaveDeletesSpace(withOther('former'), RENZO)).toBe(true);
  });

  it('con el otro adentro, el espacio queda para él', () => {
    expect(leaveDeletesSpace(withOther('active'), RENZO)).toBe(false);
  });
});

describe('leaveDeletionCopy · lo que la pantalla dice es lo que pasa', () => {
  const facts = spaceFacts({
    space: casa({ members: [renzo, martina('no_access')] }),
    expenses: [sharedExpense({ amount: 1_000, date: '2026-10-01', payerSlot: RENZO })],
    recurrences: [sharedRecurrence({ amount: 500, dayOfMonth: 1, startMonth: '2026-10', payerSlot: RENZO })],
    payments: [memberPayment({ fromSlot: 2, toSlot: 1, amount: 100, date: '2026-10-02' })],
  });
  const copy = leaveDeletionCopy(facts, 'Martina');
  const all = [copy.title, copy.why, ...copy.lost, copy.kept, copy.confirm, copy.action].join(' ');

  it('dice que se elimina y por qué', () => {
    expect(copy.title).toBe('Si salís, Casa se elimina');
    expect(copy.why).toContain('Martina nunca entró a Casa');
  });

  it('cuenta lo que se borra', () => {
    expect(copy.lost[0]).toBe('Los 3 registros de Casa (gastos, cuotas, fijos y pagos) se borran para siempre.');
  });

  it('NO promete que el otro conserva nada ni que va a decidir', () => {
    expect(all).not.toMatch(/historial/);
    expect(all).not.toMatch(/va a decidir/);
    expect(all).not.toMatch(/también son de/);
  });

  it('la confirmación es explícita e irreversible', () => {
    expect(copy.confirm).toBe('Se elimina Casa con todo lo que tiene. No se puede deshacer.');
    expect(copy.action).toBe('Eliminar Casa y salir');
  });

  it('lo que sí queda es la foto propia (SA-05)', () => {
    expect(copy.kept).toContain('Espacios que dejaste');
  });

  it('con un espacio sin registros no inventa un número', () => {
    const empty = leaveDeletionCopy(withOther('no_access'), 'Martina');
    expect(empty.lost[0]).toBe('Casa deja de existir.');
  });
});
