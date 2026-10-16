import { describe, it, expect } from 'vitest';
import { radarBarRatios, radarBarSeparators, radarBarTail } from './radarBarRatios';

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
      exceeds: false,
    });
  });

  it('§15 · N-08 · con exceso, los ingresos son el recipiente: lo asignado lo llena y lo de más no entra', () => {
    // Ingresos 1.000, Gastado 600, Comprometido 900 (asignado 1.500, de más 500).
    const ratios = radarBarRatios({ registeredIncome: 1_000, spent: 600, committed: 900 });

    expect(ratios).toEqual({
      // Fracciones del RECIPIENTE (los ingresos), no de lo asignado.
      spent: 0.6,
      committed: 0.4,
      unassigned: 0,
      exceeds: true,
    });
  });

  it('N-08 · si Gastado solo ya supera los ingresos, el recipiente es todo Gastado', () => {
    expect(radarBarRatios({ registeredIncome: 1_000, spent: 1_300, committed: 200 })).toEqual({
      spent: 1,
      committed: 0,
      unassigned: 0,
      exceeds: true,
    });
  });

  it('lo asignado justo igual a los ingresos llena el recipiente sin exceso', () => {
    expect(radarBarRatios({ registeredIncome: 1_000, spent: 400, committed: 600 })).toEqual({
      spent: 0.4,
      committed: 0.6,
      unassigned: 0,
      exceeds: false,
    });
  });

  it('con ingresos y nada asignado, todo es Sin asignar', () => {
    expect(radarBarRatios({ registeredIncome: 1_000, spent: 0, committed: 0 })).toEqual({
      spent: 0,
      committed: 0,
      unassigned: 1,
      exceeds: false,
    });
  });
});

/**
 * Decisión 1A · el tramo de más sale del recipiente A ESCALA. Con 35.000 sobre
 * 1.235.000 asignados mide unos 8px de 293: se ve que algo sale, y la etiqueta
 * lleva la cifra exacta. Si midiera menos de 6px se dibuja con 6px.
 */
describe('radarBarTail', () => {
  const base = { registeredIncome: 1_200_000, spent: 520_000, committed: 715_000 };

  it('sin exceso no hay tramo', () => {
    expect(radarBarTail({ ...base, committed: 400_000 }, 293)).toBeNull();
  });

  it('CA-03 · sin ingresos registrados no hay tramo', () => {
    expect(radarBarTail({ ...base, registeredIncome: 0 }, 293)).toBeNull();
  });

  it('a escala: el tramo es la parte de lo asignado que no entra, sobre el ancho sin el hueco', () => {
    const tail = radarBarTail(base, 293);

    expect(tail).not.toBeNull();
    expect(tail!.amount).toBe(35_000);
    expect(tail!.gap).toBe(3);
    // 35.000 / 1.235.000 de (293 - 3) = 8,22px
    expect(tail!.width).toBeCloseTo((35_000 / 1_235_000) * 290, 6);
    expect(tail!.atMinimum).toBe(false);
  });

  it('si a escala mide menos de 6px se dibuja con 6px, y lo dice', () => {
    const tail = radarBarTail({ ...base, spent: 500_000, committed: 705_000 }, 293);

    expect(tail!.amount).toBe(5_000);
    expect(tail!.width).toBe(6);
    expect(tail!.atMinimum).toBe(true);
  });

  it('justo en 6px no es mínimo forzado', () => {
    // 6 / 290 de lo asignado: asignado = 1.200.000 / (1 - 6/290) = ...; se arma con enteros.
    const tail = radarBarTail({ registeredIncome: 2_840, spent: 2_840, committed: 60 }, 300);

    // 60 / 2.900 * 297 = 6,14px
    expect(tail!.width).toBeCloseTo(6.145, 2);
    expect(tail!.atMinimum).toBe(false);
  });

  it('antes de medir (ancho 0) usa el mínimo, para que se vea que algo sale', () => {
    const tail = radarBarTail(base, 0);

    expect(tail!.width).toBe(6);
    expect(tail!.atMinimum).toBe(true);
  });

  it('un ancho diminuto nunca deja un tramo más grande que el espacio', () => {
    const tail = radarBarTail(base, 8);

    expect(tail!.width).toBeLessThanOrEqual(5);
  });

  it('un exceso enorme no se come el recipiente: el tramo es proporcional', () => {
    // Asignado el doble de los ingresos: el recipiente y el tramo miden lo mismo.
    const tail = radarBarTail({ registeredIncome: 1_000, spent: 2_000, committed: 0 }, 203);

    expect(tail!.width).toBeCloseTo(100, 6);
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
