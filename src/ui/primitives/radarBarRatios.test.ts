import { describe, it, expect } from 'vitest';
import { radarBarRatios, radarBarSeparators } from './radarBarRatios';

/**
 * UX-04 · §15 · CA-03 · las proporciones de la barra del radar.
 */

describe('radarBarRatios', () => {
  it('CA-03 · sin ingresos registrados no hay proporciones, aunque haya gastos', () => {
    expect(radarBarRatios({ registeredIncome: 0, spent: 50_000, committed: 120_000 })).toBeNull();
  });

  it('sin ingresos y sin nada cargado tampoco', () => {
    expect(radarBarRatios({ registeredIncome: 0, spent: 0, committed: 0 })).toBeNull();
  });

  it('un ingreso negativo no es un ingreso', () => {
    expect(radarBarRatios({ registeredIncome: -1, spent: 10, committed: 10 })).toBeNull();
  });

  it('con ingresos, lo lleno es lo asignado y el resto es Sin asignar', () => {
    expect(radarBarRatios({ registeredIncome: 1_000, spent: 300, committed: 200 })).toEqual({
      spent: 0.3,
      committed: 0.2,
      unassigned: 0.5,
      incomeMark: 1,
      exceeds: false,
    });
  });

  it('§15 · N-08 · si lo asignado supera los ingresos, la barra se llena y la marca queda en los ingresos', () => {
    const ratios = radarBarRatios({ registeredIncome: 1_000, spent: 600, committed: 900 });

    expect(ratios).not.toBeNull();
    expect(ratios!.exceeds).toBe(true);
    expect(ratios!.unassigned).toBe(0);
    expect(ratios!.spent + ratios!.committed).toBeCloseTo(1, 10);
    expect(ratios!.incomeMark).toBeCloseTo(1_000 / 1_500, 10);
  });

  it('con ingresos y nada asignado, todo es Sin asignar', () => {
    expect(radarBarRatios({ registeredIncome: 1_000, spent: 0, committed: 0 })).toEqual({
      spent: 0,
      committed: 0,
      unassigned: 1,
      incomeMark: 1,
      exceeds: false,
    });
  });
});

/**
 * UX-03 · 2px de separación del color del fondo SOLO entre segmentos que
 * existen: un segmento de ancho 0 no debe dejar una raya suelta.
 */
describe('UX-03 · radarBarSeparators', () => {
  const sep = (spent: number, committed: number, income = 1_000) =>
    radarBarSeparators(radarBarRatios({ registeredIncome: income, spent, committed }));

  it('sin proporciones (sin ingresos) no hay separadores', () => {
    expect(radarBarSeparators(null)).toEqual({ spentCommitted: false, assignedUnassigned: false });
  });

  it('con los tres segmentos hay dos separadores', () => {
    expect(sep(300, 200)).toEqual({ spentCommitted: true, assignedUnassigned: true });
  });

  it('sin Comprometido solo separa lo gastado del track', () => {
    expect(sep(300, 0)).toEqual({ spentCommitted: false, assignedUnassigned: true });
  });

  it('sin Gastado solo separa lo comprometido del track', () => {
    expect(sep(0, 200)).toEqual({ spentCommitted: false, assignedUnassigned: true });
  });

  it('con exceso no queda track: solo separa Gastado de Comprometido', () => {
    expect(sep(600, 900)).toEqual({ spentCommitted: true, assignedUnassigned: false });
  });

  it('con nada asignado todo es track y no hay separadores', () => {
    expect(sep(0, 0)).toEqual({ spentCommitted: false, assignedUnassigned: false });
  });
});
