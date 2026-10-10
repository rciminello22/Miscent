import { describe, it, expect } from 'vitest';
import { paymentSentence } from './balanceCopy';

/**
 * §25 · un pago entre miembros, en segunda persona y en las dos direcciones.
 * Hasta el 10/10 los pagos no se mostraban en ningún lado del espacio: el
 * saldo cambiaba y no se veía por qué.
 */
describe('paymentSentence', () => {
  it('el otro me pagó', () => {
    expect(paymentSentence({ fromSlot: 2, toSlot: 1, amount: 15_000 }, 1, 'Martina')).toBe(
      'Martina te pagó $15.000',
    );
  });

  it('yo le pagué al otro', () => {
    expect(paymentSentence({ fromSlot: 1, toSlot: 2, amount: 15_000 }, 1, 'Martina')).toBe(
      'Le pagaste $15.000 a Martina',
    );
  });

  it('visto desde el otro lado, el mismo pago se lee al revés', () => {
    expect(paymentSentence({ fromSlot: 2, toSlot: 1, amount: 15_000 }, 2, 'Renzo')).toBe(
      'Le pagaste $15.000 a Renzo',
    );
  });
});
