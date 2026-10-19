/**
 * El tope de un monto (Montos · 11).
 *
 * Un monto no pasa de $999.999.999. La base guarda `integer` (máximo
 * 2.147.483.647), así que el tope deja margen para sumar varios montos sin
 * desbordar. Un dígito de más se ignora: no se borra lo escrito.
 */

import { describe, it, expect } from 'vitest';
import { MAX_AMOUNT, typeAmount } from '../money';

describe('MAX_AMOUNT', () => {
  it('es 999.999.999 y entra en el integer de la base', () => {
    expect(MAX_AMOUNT).toBe(999_999_999);
    expect(MAX_AMOUNT).toBeLessThan(2_147_483_647);
  });
});

describe('typeAmount · lo que pasa al escribir', () => {
  it('toma los dígitos e ignora los puntos del formato', () => {
    expect(typeAmount('1.234', 123)).toEqual({ amount: 1234, capped: false });
  });

  it('el tope exacto se acepta', () => {
    expect(typeAmount('999.999.999', 99_999_999)).toEqual({ amount: 999_999_999, capped: false });
  });

  it('un dígito de más se ignora: queda lo que había y avisa', () => {
    expect(typeAmount('9.999.999.999', 999_999_999)).toEqual({
      amount: 999_999_999,
      capped: true,
    });
    expect(typeAmount('1.000.000.000', 100_000_000)).toEqual({
      amount: 100_000_000,
      capped: true,
    });
  });

  it('pegar un número enorme no cambia lo escrito', () => {
    expect(typeAmount('123456789012345678', 4_500)).toEqual({ amount: 4_500, capped: true });
  });

  it('borrar sigue andando, incluso desde el tope', () => {
    expect(typeAmount('99.999.999', 999_999_999)).toEqual({ amount: 99_999_999, capped: false });
    expect(typeAmount('', 5)).toEqual({ amount: 0, capped: false });
  });

  it('los ceros a la izquierda no cuentan como dígitos de más', () => {
    expect(typeAmount('0000000005', 0)).toEqual({ amount: 5, capped: false });
  });

  it('las letras y los símbolos se descartan', () => {
    expect(typeAmount('$12a', 0)).toEqual({ amount: 12, capped: false });
  });
});
