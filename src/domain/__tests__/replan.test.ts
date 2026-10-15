import { describe, it, expect } from 'vitest';
import { shouldReplan, type PlanDefiningFacts } from '../installments';

/**
 * X-04 / F2 / PR-02 · ¿una edición obliga a rearmar el plan de cuotas?
 *
 * El plan (mes de la primera cuota y día de impacto) se persiste porque deriva
 * de la tarjeta de quien pagó, que el otro miembro no puede ver. Rearmarlo en
 * una edición que no lo afecta lo pisaría con un cálculo sin esa tarjeta.
 */
const before: PlanDefiningFacts = {
  date: '2026-10-03',
  installmentCount: 6,
  payerSlot: 1,
  payerMethodId: null,
};

describe('shouldReplan · solo se rearma lo que define el plan', () => {
  it('cambiar solo la descripción, el monto, la categoría o el reparto NO rearma (C-02 recalcula partes, no fechas)', () => {
    // Estos campos ni siquiera forman parte de los hechos que definen el plan.
    expect(shouldReplan(before, { ...before })).toBe(false);
  });

  it('el no pagador edita una compra con la tarjeta del otro: no rearma', () => {
    const mine = { ...before, payerSlot: 2 as const, payerMethodId: null };
    expect(shouldReplan(mine, { ...mine })).toBe(false);
  });

  it('cambiar la cantidad de cuotas rearma', () => {
    expect(shouldReplan(before, { ...before, installmentCount: 12 })).toBe(true);
  });

  it('pasar de cuotas a un solo pago rearma (el plan se borra)', () => {
    expect(shouldReplan(before, { ...before, installmentCount: null })).toBe(true);
  });

  it('pasar de un solo pago a cuotas rearma', () => {
    expect(
      shouldReplan({ ...before, installmentCount: null }, { ...before, installmentCount: 3 }),
    ).toBe(true);
  });

  it('un solo pago que sigue siendo un solo pago no rearma', () => {
    const single = { ...before, installmentCount: null };
    expect(shouldReplan(single, { ...single, date: '2026-10-05' })).toBe(false);
  });

  it('cambiar la fecha de una compra en cuotas rearma', () => {
    expect(shouldReplan(before, { ...before, date: '2026-10-28' })).toBe(true);
  });

  it('cambiar quién pagó rearma', () => {
    expect(shouldReplan(before, { ...before, payerSlot: 2 })).toBe(true);
  });

  it('cambiar el medio de pago de quien pagó rearma', () => {
    expect(shouldReplan(before, { ...before, payerMethodId: 'visa' })).toBe(true);
    expect(
      shouldReplan({ ...before, payerMethodId: 'visa' }, { ...before, payerMethodId: 'master' }),
    ).toBe(true);
    expect(shouldReplan({ ...before, payerMethodId: 'visa' }, before)).toBe(true);
  });

  it('un movimiento personal (sin pagador) con el mismo medio no rearma', () => {
    const personal: PlanDefiningFacts = {
      date: '2026-10-03',
      installmentCount: 3,
      payerMethodId: 'visa',
    };
    expect(shouldReplan(personal, { ...personal })).toBe(false);
    expect(shouldReplan(personal, { ...personal, payerMethodId: null })).toBe(true);
  });
});
