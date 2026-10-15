import { describe, it, expect } from 'vitest';
import { personalRecurrence, sharedRecurrence, RENZO } from '@domain/__tests__/fixtures';
import { selectFixedExpenses } from './fixedExpenses';

/**
 * UX-21 · Perfil > Fijos abre la lista de los gastos fijos personales, y el
 * número de la fila de Perfil sale de la MISMA función (como en los ingresos).
 */

const alquiler = (extra: Partial<Parameters<typeof personalRecurrence>[0]> = {}) =>
  personalRecurrence({
    kind: 'expense',
    amount: 400_000,
    dayOfMonth: 5,
    startMonth: '2026-01',
    category: 'alquiler',
    ...extra,
  });

describe('UX-21 · selectFixedExpenses', () => {
  it('deja solo los gastos fijos personales: ni ingresos ni fijos de un espacio', () => {
    const ingreso = personalRecurrence({
      kind: 'income',
      amount: 1_000_000,
      dayOfMonth: 1,
      startMonth: '2026-01',
      category: 'sueldo',
    });
    const compartido = sharedRecurrence({
      amount: 500_000,
      dayOfMonth: 1,
      startMonth: '2026-01',
      payerSlot: RENZO,
    });

    const result = selectFixedExpenses([ingreso, compartido, alquiler({ id: 'alquiler' })], '2026-10');

    expect(result.map((item) => item.id)).toEqual(['alquiler']);
  });

  it('ordena por día del mes y, a igual día, el de mayor monto primero', () => {
    const result = selectFixedExpenses(
      [
        alquiler({ id: 'tarde', dayOfMonth: 20 }),
        alquiler({ id: 'chico', dayOfMonth: 5, amount: 10_000 }),
        alquiler({ id: 'grande', dayOfMonth: 5, amount: 900_000 }),
      ],
      '2026-10',
    );

    expect(result.map((item) => item.id)).toEqual(['grande', 'chico', 'tarde']);
  });

  it('no incluye los que ya terminaron antes del mes en curso (ya no cuentan)', () => {
    const result = selectFixedExpenses(
      [
        alquiler({ id: 'viejo', endMonth: '2026-08' }),
        alquiler({ id: 'hasta-este-mes', endMonth: '2026-10' }),
        alquiler({ id: 'vigente' }),
      ],
      '2026-10',
    );

    expect(result.map((item) => item.id).sort()).toEqual(['hasta-este-mes', 'vigente']);
  });

  it('incluye uno que empieza más adelante: ya está cargado y hay que poder corregirlo', () => {
    const result = selectFixedExpenses([alquiler({ id: 'futuro', startMonth: '2026-12' })], '2026-10');

    expect(result.map((item) => item.id)).toEqual(['futuro']);
  });

  it('sin fijos, la lista está vacía', () => {
    expect(selectFixedExpenses([], '2026-10')).toEqual([]);
  });

  it('no muta lo que recibe', () => {
    const input = [alquiler({ id: 'b', dayOfMonth: 9 }), alquiler({ id: 'a', dayOfMonth: 1 })];
    selectFixedExpenses(input, '2026-10');

    expect(input.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
