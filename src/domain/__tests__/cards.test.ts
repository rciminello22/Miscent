import { describe, it, expect } from 'vitest';
import { lastClosedStatement, resolveCardPayment } from '../cards';
import { addMonths } from '../calendar';
import type { PaymentMethod } from '../types';

function card(closingDay: number | null, dueDay: number | null): PaymentMethod {
  return { id: 'visa', kind: 'card', name: 'Visa Galicia', closingDay, dueDay };
}

describe('tarjetas · T-03, T-05', () => {
  it('CA-30 · cierre 25, vence 5: compra del 20/10 → noviembre; del 27/10 → diciembre', () => {
    const visa = card(25, 5);

    const antes = resolveCardPayment(visa, '2026-10-20');
    expect(antes).toEqual({ month: '2026-11', dueDate: '2026-11-05', approximate: false });

    const despues = resolveCardPayment(visa, '2026-10-27');
    expect(despues).toEqual({ month: '2026-12', dueDate: '2026-12-05', approximate: false });
  });

  it('§22 · cierre 3, vence 15: compra del 2/10 → vence 15/10', () => {
    const otra = card(3, 15);
    expect(resolveCardPayment(otra, '2026-10-02')).toEqual({
      month: '2026-10',
      dueDate: '2026-10-15',
      approximate: false,
    });
  });

  it('una compra el día exacto del cierre entra en ese cierre', () => {
    const visa = card(25, 5);
    expect(resolveCardPayment(visa, '2026-10-25').dueDate).toBe('2026-11-05');
  });

  it('T-05 · solo cierre: vence el mes siguiente al cierre, sin día', () => {
    const visa = card(25, null);
    expect(resolveCardPayment(visa, '2026-10-20')).toEqual({
      month: '2026-11',
      dueDate: null,
      approximate: true,
    });
    // Compra después del cierre: el cierre es 25/11 → paga en diciembre.
    expect(resolveCardPayment(visa, '2026-10-27').month).toBe('2026-12');
  });

  it('T-05 · solo vencimiento: lo comprado en M se paga en M+1, con su día', () => {
    const visa = card(null, 5);
    expect(resolveCardPayment(visa, '2026-10-20')).toEqual({
      month: '2026-11',
      dueDate: '2026-11-05',
      approximate: true,
    });
  });

  it('T-05 · ninguno de los dos: M se paga en M+1 y NUNCA se inventa un día', () => {
    const visa = card(null, null);
    expect(resolveCardPayment(visa, '2026-10-20')).toEqual({
      month: '2026-11',
      dueDate: null,
      approximate: true,
    });
  });

  it('T-04 · vencimiento día 31: dentro del mismo mes si existe', () => {
    // Cierre 25/03, día de vencimiento 31 → 31/03 ES posterior al cierre.
    const visa = card(25, 31);
    expect(resolveCardPayment(visa, '2026-03-20').dueDate).toBe('2026-03-31');
  });

  it('T-04 · vencimiento día 31 en febrero cae el último día del mes', () => {
    // Compra 26/01 → cierre 25/02 → primera fecha con día 31 posterior:
    // febrero no tiene 31, se corrige al 28.
    const visa = card(25, 31);
    expect(resolveCardPayment(visa, '2026-01-26').dueDate).toBe('2026-02-28');
  });

  it('T-04 · cierre día 31 en un mes de 30 cae el último día', () => {
    const visa = card(31, 10);
    // Compra 15/04 → cierre 30/04 → vencimiento 10/05.
    expect(resolveCardPayment(visa, '2026-04-15')).toEqual({
      month: '2026-05',
      dueDate: '2026-05-10',
      approximate: false,
    });
  });
});

/**
 * T-07 y Q-06 hablan del "último resumen cerrado" al activar la cuenta. El
 * cierre es ESTRICTAMENTE anterior a hoy: el día del cierre el resumen todavía
 * recibe compras (T-03 · "igual o posterior a la compra").
 */
describe('último resumen cerrado · T-07, Q-06', () => {
  it('cierre 25, vence 5, hoy 9/10: el último cerró el 25/9 y vence el 5/10 (ya pasó, y es correcto)', () => {
    expect(lastClosedStatement(card(25, 5), '2026-10-09')).toEqual({
      month: '2026-10',
      dueDate: '2026-10-05',
      approximate: false,
    });
  });

  it('cierre 25, vence 5, hoy 28/10: ya cerró el de octubre, vence el 5/11', () => {
    expect(lastClosedStatement(card(25, 5), '2026-10-28').dueDate).toBe('2026-11-05');
  });

  it('el día del cierre el resumen sigue abierto: el último cerrado es el anterior', () => {
    expect(lastClosedStatement(card(25, 5), '2026-10-25').dueDate).toBe('2026-10-05');
  });

  it('cierre 3, vence 15, hoy 9/10: cerró el 3/10, vence el 15/10', () => {
    expect(lastClosedStatement(card(3, 15), '2026-10-09').dueDate).toBe('2026-10-15');
  });

  it('T-04 · cierre 31 en un mes de 28 días: cerró el 28/2', () => {
    expect(lastClosedStatement(card(31, 10), '2026-03-15').dueDate).toBe('2026-03-10');
  });

  it('T-05 · solo cierre: el mes siguiente al cierre, sin día', () => {
    expect(lastClosedStatement(card(25, null), '2026-10-28')).toEqual({
      month: '2026-11',
      dueDate: null,
      approximate: true,
    });
  });

  it('T-05 · solo vencimiento: lo del mes pasado se paga este mes', () => {
    expect(lastClosedStatement(card(null, 5), '2026-10-09')).toEqual({
      month: '2026-10',
      dueDate: '2026-10-05',
      approximate: true,
    });
  });

  it('T-05 · sin días: este mes, sin inventar un día', () => {
    expect(lastClosedStatement(card(null, null), '2026-10-09')).toEqual({
      month: '2026-10',
      dueDate: null,
      approximate: true,
    });
  });

  it('T-08 · los consumos de hoy caen SIEMPRE en el resumen siguiente al último cerrado', () => {
    const tarjetas = [card(25, 5), card(3, 15), card(31, 10), card(25, null), card(null, 5), card(null, null)];
    const dias = ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-31', '2026-02-28'];

    for (const tarjeta of tarjetas) {
      for (const hoy of dias) {
        const cerrado = lastClosedStatement(tarjeta, hoy);
        expect(resolveCardPayment(tarjeta, hoy).month, `${JSON.stringify(tarjeta)} · ${hoy}`).toBe(
          addMonths(cerrado.month, 1),
        );
      }
    }
  });
});
