import { describe, it, expect } from 'vitest';
import {
  addDays,
  addMonths,
  clampDay,
  dateInMonth,
  earliestEntryDate,
  isEntryDateAllowed,
  isYesterdayAllowed,
  firstDateWithDayAfter,
  firstDateWithDayOnOrAfter,
  hasPassed,
  lastDayOfMonth,
  monthOf,
  monthRange,
} from '../calendar';

describe('calendario', () => {
  it('T-04 · un día inexistente se corrige al último día del mes', () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
    expect(clampDay(2028, 2, 31)).toBe(29); // bisiesto
    expect(clampDay(2026, 4, 31)).toBe(30);
    expect(clampDay(2026, 1, 31)).toBe(31);
    expect(dateInMonth('2026-02', 30)).toBe('2026-02-28');
  });

  it('lastDayOfMonth', () => {
    expect(lastDayOfMonth(2026, 1)).toBe(31);
    expect(lastDayOfMonth(2026, 2)).toBe(28);
    expect(lastDayOfMonth(2026, 12)).toBe(31);
  });

  it('monthOf y addMonths cruzan el año sin perderse', () => {
    expect(monthOf('2026-10-20')).toBe('2026-10');
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -2)).toBe('2026-11');
  });

  it('monthRange devuelve los 6 meses de Futuro', () => {
    expect(monthRange('2026-11', 6)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
    ]);
  });

  it('T-03 · cierre: primera fecha con el día de cierre igual o posterior a la compra', () => {
    // Cierre 25. Spec §22, ejemplos.
    expect(firstDateWithDayOnOrAfter('2026-10-20', 25)).toBe('2026-10-25');
    expect(firstDateWithDayOnOrAfter('2026-10-25', 25)).toBe('2026-10-25'); // igual cuenta
    expect(firstDateWithDayOnOrAfter('2026-10-27', 25)).toBe('2026-11-25');
    // Cierre 3, compra 2/10.
    expect(firstDateWithDayOnOrAfter('2026-10-02', 3)).toBe('2026-10-03');
  });

  it('T-03 · vencimiento: primera fecha con el día de vencimiento POSTERIOR al cierre', () => {
    expect(firstDateWithDayAfter('2026-10-25', 5)).toBe('2026-11-05');
    expect(firstDateWithDayAfter('2026-11-25', 5)).toBe('2026-12-05');
    // Cierre 3/10, vence 15 → 15/10 (mismo mes).
    expect(firstDateWithDayAfter('2026-10-03', 15)).toBe('2026-10-15');
    // Si el día coincide con el cierre, se va al mes siguiente (estricto).
    expect(firstDateWithDayAfter('2026-10-05', 5)).toBe('2026-11-05');
  });

  it('T-04 en el cierre y el vencimiento: día 31 en febrero', () => {
    expect(firstDateWithDayOnOrAfter('2026-02-10', 31)).toBe('2026-02-28');
    expect(firstDateWithDayAfter('2026-01-31', 31)).toBe('2026-02-28');
  });

  it('G-06 · hasPassed detecta que la fecha llegó, sin afirmar que se pagó', () => {
    expect(hasPassed('2026-10-05', '2026-10-07')).toBe(true);
    expect(hasPassed('2026-10-07', '2026-10-07')).toBe(true);
    expect(hasPassed('2026-10-08', '2026-10-07')).toBe(false);
  });
});

describe('addDays · "Ayer" en el formulario (§17 campo 10)', () => {
  it('resta un día dentro del mes', () => {
    expect(addDays('2026-10-09', -1)).toBe('2026-10-08');
  });

  it('cruza el mes y el año', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('respeta febrero, bisiesto o no', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('fecha mínima de carga · el día 1 del mes en curso', () => {
  it('earliestEntryDate es el día 1 del mes de hoy', () => {
    expect(earliestEntryDate('2026-10-15')).toBe('2026-10-01');
    expect(earliestEntryDate('2026-10-01')).toBe('2026-10-01');
    expect(earliestEntryDate('2026-12-31')).toBe('2026-12-01');
  });

  it('se puede cargar del día 1 del mes hasta hoy, ambos incluidos', () => {
    expect(isEntryDateAllowed('2026-10-01', '2026-10-15')).toBe(true);
    expect(isEntryDateAllowed('2026-10-09', '2026-10-15')).toBe(true);
    expect(isEntryDateAllowed('2026-10-15', '2026-10-15')).toBe(true);
  });

  it('no se puede cargar en un mes que ya pasó ni en el futuro', () => {
    expect(isEntryDateAllowed('2026-09-30', '2026-10-15')).toBe(false);
    expect(isEntryDateAllowed('2025-10-15', '2026-10-15')).toBe(false);
    expect(isEntryDateAllowed('2026-10-16', '2026-10-15')).toBe(false);
  });

  it('"Ayer" se ofrece salvo el día 1, cuando caería en el mes anterior', () => {
    expect(isYesterdayAllowed('2026-10-15')).toBe(true);
    expect(isYesterdayAllowed('2026-10-02')).toBe(true);
    expect(isYesterdayAllowed('2026-10-01')).toBe(false);
    expect(isYesterdayAllowed('2026-01-01')).toBe(false);
  });
});
