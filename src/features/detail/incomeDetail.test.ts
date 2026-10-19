import { describe, it, expect } from 'vitest';
import {
  fixedIncomeDetail,
  ONE_OFF_INCOME_LABEL,
  oneOffIncomeDetail,
} from './incomeDetail';

/**
 * 15·5 · el detalle de un ingreso. Hoy: 19 de octubre de 2026.
 */

const TODAY = '2026-10-19';

describe('fixedIncomeDetail · un ingreso fijo', () => {
  it('"Fijo · cada ~28 · desde octubre" y la tarjeta: Qué es, Desde y Día aproximado', () => {
    expect(
      fixedIncomeDetail({ dayOfMonth: 28, dayApprox: true, startMonth: '2026-10', endMonth: null }, TODAY),
    ).toEqual({
      subtitle: 'Fijo · cada ~28 · desde octubre',
      facts: [
        { label: 'Qué es', value: 'Fijo, se repite todos los meses' },
        { label: 'Desde', value: 'octubre' },
        { label: 'Día', value: 'cada ~28 · aproximado' },
      ],
    });
  });

  it('con día exacto no dice "aproximado"', () => {
    const detail = fixedIncomeDetail(
      { dayOfMonth: 5, dayApprox: false, startMonth: '2026-10', endMonth: null },
      TODAY,
    );

    expect(detail.subtitle).toBe('Fijo · cada día 5 · desde octubre');
    expect(detail.facts[2]).toEqual({ label: 'Día', value: 'cada día 5' });
  });

  it('sin día ("No sé") lo dice, sin inventar uno', () => {
    const detail = fixedIncomeDetail(
      { dayOfMonth: null, dayApprox: false, startMonth: '2026-10', endMonth: null },
      TODAY,
    );

    expect(detail.subtitle).toBe('Fijo · sin día · desde octubre');
    expect(detail.facts[2]).toEqual({ label: 'Día', value: 'sin día' });
  });

  it('el mes de inicio de otro año lleva el año; la mayúscula no va a mitad de frase', () => {
    const detail = fixedIncomeDetail(
      { dayOfMonth: 5, dayApprox: false, startMonth: '2025-03', endMonth: null },
      TODAY,
    );

    expect(detail.subtitle).toBe('Fijo · cada día 5 · desde marzo de 2025');
    expect(detail.facts[1]).toEqual({ label: 'Desde', value: 'marzo de 2025' });
    expect(detail.subtitle).not.toMatch(/Marzo|Octubre/);
  });

  it('si ya tiene fin, también lo dice', () => {
    const detail = fixedIncomeDetail(
      { dayOfMonth: 5, dayApprox: false, startMonth: '2026-10', endMonth: '2026-12' },
      TODAY,
    );

    expect(detail.subtitle).toBe('Fijo · cada día 5 · desde octubre · hasta diciembre');
  });
});

describe('oneOffIncomeDetail · un ingreso puntual', () => {
  const income = { date: '2026-10-12', categoryLabel: 'Otros ingresos' };

  it('"Extra · 12 de octubre" y la tarjeta: Qué es, Cuándo y Categoría', () => {
    expect(oneOffIncomeDetail(income, TODAY)).toEqual({
      subtitle: 'Extra · 12 de octubre',
      facts: [
        { label: 'Qué es', value: 'Extra, entró una sola vez' },
        { label: 'Cuándo', value: '12 de octubre' },
        { label: 'Categoría', value: 'Otros ingresos' },
      ],
    });
  });

  it('una fecha de otro año lleva el año', () => {
    const detail = oneOffIncomeDetail({ ...income, date: '2025-12-30' }, TODAY);

    expect(detail.subtitle).toBe('Extra · 30 de diciembre de 2025');
    expect(detail.facts[1]?.value).toBe('30 de diciembre de 2025');
  });

  it('"Extra" es una sola constante de copy, la misma que usa la lista', () => {
    expect(ONE_OFF_INCOME_LABEL).toBe('Extra');
    const detail = oneOffIncomeDetail(income, TODAY);

    expect(detail.subtitle.startsWith(ONE_OFF_INCOME_LABEL)).toBe(true);
    expect(detail.facts[0]?.value.startsWith(ONE_OFF_INCOME_LABEL)).toBe(true);
    expect(JSON.stringify(detail)).not.toContain('Ingreso registrado');
  });

  it('CA-00 · ni "disponible" ni "libre" ni "Pagado"', () => {
    const text = JSON.stringify([
      oneOffIncomeDetail(income, TODAY),
      fixedIncomeDetail({ dayOfMonth: 28, dayApprox: true, startMonth: '2026-10', endMonth: null }, TODAY),
    ]);

    expect(text).not.toMatch(/disponible|libre|pagad[oa]|te queda/i);
  });
});
