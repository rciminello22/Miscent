import { describe, it, expect } from 'vitest';
import {
  contributionSplit,
  monthBounds,
  monthDoorCopy,
  parseMonthParam,
  stepMonths,
} from './spaceMonth';

/**
 * El Detalle del mes (N3): un selector de mes que cubre también los próximos
 * meses y reemplaza a la hoja de "Próximos meses de Casa" (§23.4).
 */
describe('parseMonthParam', () => {
  it('un mes válido de la ruta', () => {
    expect(parseMonthParam('2026-11', '2026-10')).toBe('2026-11');
  });

  it('sin parámetro o con basura, el mes en curso', () => {
    expect(parseMonthParam(undefined, '2026-10')).toBe('2026-10');
    expect(parseMonthParam('', '2026-10')).toBe('2026-10');
    expect(parseMonthParam('noviembre', '2026-10')).toBe('2026-10');
    expect(parseMonthParam('2026-13', '2026-10')).toBe('2026-10');
    expect(parseMonthParam('2026-00', '2026-10')).toBe('2026-10');
    expect(parseMonthParam('2026-1', '2026-10')).toBe('2026-10');
  });
});

describe('monthBounds', () => {
  it('va del primer mes con movimientos al último compromiso, y siempre incluye el actual', () => {
    expect(
      monthBounds({ months: ['2026-08', '2026-10', '2027-02'], current: '2026-10' }),
    ).toEqual({ min: '2026-08', max: '2027-02' });
  });

  it('sin historia ni compromisos, solo el mes en curso', () => {
    expect(monthBounds({ months: [], current: '2026-10' })).toEqual({
      min: '2026-10',
      max: '2026-10',
    });
  });

  it('si todo es pasado, el máximo es el mes en curso', () => {
    expect(monthBounds({ months: ['2026-07'], current: '2026-10' })).toEqual({
      min: '2026-07',
      max: '2026-10',
    });
  });

  it('si todo es futuro, el mínimo es el mes en curso', () => {
    expect(monthBounds({ months: ['2026-12'], current: '2026-10' })).toEqual({
      min: '2026-10',
      max: '2026-12',
    });
  });
});

describe('stepMonths', () => {
  const bounds = { min: '2026-08', max: '2026-12' };

  it('en el medio se puede ir para los dos lados', () => {
    expect(stepMonths('2026-10', bounds)).toEqual({ prev: '2026-09', next: '2026-11' });
  });

  it('en los extremos ese lado queda apagado', () => {
    expect(stepMonths('2026-08', bounds)).toEqual({ prev: null, next: '2026-09' });
    expect(stepMonths('2026-12', bounds)).toEqual({ prev: '2026-11', next: null });
  });

  it('cruza el año', () => {
    expect(stepMonths('2027-01', { min: '2026-11', max: '2027-03' })).toEqual({
      prev: '2026-12',
      next: '2027-02',
    });
  });
});

describe('monthDoorCopy · la puerta del mes', () => {
  it('"Octubre · $700.000 entre los dos"', () => {
    expect(monthDoorCopy({ month: '2026-10', currentMonth: '2026-10', total: 700_000 })).toEqual({
      title: 'Octubre',
      value: '$700.000',
      caption: 'entre los dos',
    });
  });

  it('sin gastos todavía en el mes, no hay cifra: lo que hay es lo que se viene', () => {
    expect(monthDoorCopy({ month: '2026-10', currentMonth: '2026-10', total: 0 })).toEqual({
      title: 'Octubre',
      value: null,
      caption: 'Lo que se viene',
    });
  });
});

describe('contributionSplit · la barra de dos tramos de la puerta del mes', () => {
  it('reparte el ancho según lo que puso cada uno, vos primero', () => {
    const split = contributionSplit({ me: 420_000, other: 280_000 });
    expect(split).not.toBeNull();
    expect(split!.me).toBeCloseTo(0.6);
    expect(split!.other).toBeCloseTo(0.4);
  });

  it('si solo puso uno, ocupa todo', () => {
    expect(contributionSplit({ me: 340_000, other: 0 })).toEqual({ me: 1, other: 0 });
    expect(contributionSplit({ me: 0, other: 50 })).toEqual({ me: 0, other: 1 });
  });

  it('si nadie puso nada no hay barra', () => {
    expect(contributionSplit({ me: 0, other: 0 })).toBeNull();
  });
});
