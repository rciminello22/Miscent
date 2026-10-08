import { describe, it, expect } from 'vitest';
import { resolveCardPayment } from '../cards';
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
