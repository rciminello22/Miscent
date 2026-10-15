import { describe, it, expect } from 'vitest';
import { personalRecurrence, sharedRecurrence, RENZO } from '@domain/__tests__/fixtures';
import { selectFixedIncomes } from './fixedIncomes';

/**
 * UX-01 · Perfil > Ingresos abre la lista de ingresos fijos, y el número de la
 * fila de Perfil sale de la MISMA función: la cuenta y la lista no pueden
 * discrepar.
 */

const sueldo = (extra: Partial<Parameters<typeof personalRecurrence>[0]> = {}) =>
  personalRecurrence({
    kind: 'income',
    amount: 1_000_000,
    dayOfMonth: 5,
    startMonth: '2026-01',
    category: 'sueldo',
    ...extra,
  });

describe('UX-01 · selectFixedIncomes', () => {
  it('deja solo los ingresos fijos personales', () => {
    const gasto = personalRecurrence({
      kind: 'expense',
      amount: 50_000,
      dayOfMonth: 3,
      startMonth: '2026-01',
      category: 'alquiler',
    });
    const compartido = sharedRecurrence({
      amount: 500_000,
      dayOfMonth: 1,
      startMonth: '2026-01',
      payerSlot: RENZO,
    });
    const ingreso = sueldo({ id: 'sueldo' });

    const result = selectFixedIncomes([gasto, compartido, ingreso], '2026-10');

    expect(result.map((item) => item.id)).toEqual(['sueldo']);
  });

  it('ordena por día de cobro y, a igual día, el de mayor monto primero', () => {
    const result = selectFixedIncomes(
      [
        sueldo({ id: 'tarde', dayOfMonth: 20 }),
        sueldo({ id: 'chico', dayOfMonth: 5, amount: 100_000 }),
        sueldo({ id: 'grande', dayOfMonth: 5, amount: 900_000 }),
      ],
      '2026-10',
    );

    expect(result.map((item) => item.id)).toEqual(['grande', 'chico', 'tarde']);
  });

  it('no incluye los que ya terminaron antes del mes en curso', () => {
    const result = selectFixedIncomes(
      [
        sueldo({ id: 'viejo', endMonth: '2026-08' }),
        sueldo({ id: 'hasta-este-mes', endMonth: '2026-10' }),
        sueldo({ id: 'vigente' }),
      ],
      '2026-10',
    );

    expect(result.map((item) => item.id).sort()).toEqual(['hasta-este-mes', 'vigente']);
  });

  it('incluye uno que empieza en un mes futuro: ya está cargado', () => {
    const result = selectFixedIncomes([sueldo({ id: 'futuro', startMonth: '2026-12' })], '2026-10');

    expect(result.map((item) => item.id)).toEqual(['futuro']);
  });

  it('sin ingresos, la lista está vacía (y el CTA es registrar uno)', () => {
    expect(selectFixedIncomes([], '2026-10')).toEqual([]);
  });

  it('no muta lo que recibe', () => {
    const input = [sueldo({ id: 'b', dayOfMonth: 9 }), sueldo({ id: 'a', dayOfMonth: 1 })];
    selectFixedIncomes(input, '2026-10');

    expect(input.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
