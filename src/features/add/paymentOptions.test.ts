import { describe, it, expect } from 'vitest';
import type { PaymentMethod } from '@domain/types';
import { paymentOptions } from './paymentOptions';

const visa: PaymentMethod = { id: 'visa', kind: 'card', name: 'Visa', closingDay: 25, dueDay: 5 };
const master: PaymentMethod = { id: 'master', kind: 'card', name: 'Master', closingDay: 20, dueDay: 2 };

describe('§17 campo 7 · efectivo, débito, billetera, transferencia o una tarjeta', () => {
  it('sin ningún medio cargado, igual ofrece los cuatro al contado', () => {
    expect(paymentOptions([])).toEqual([
      { key: 'new:cash', kind: 'cash', name: 'Efectivo', methodId: null },
      { key: 'new:debit', kind: 'debit', name: 'Débito', methodId: null },
      { key: 'new:wallet', kind: 'wallet', name: 'Billetera', methodId: null },
      { key: 'new:transfer', kind: 'transfer', name: 'Transferencia', methodId: null },
    ]);
  });

  it('las tarjetas van después, en su orden: lo de todos los días queda a mano', () => {
    const keys = paymentOptions([master, visa]).map((option) => option.key);
    expect(keys).toEqual(['new:cash', 'new:debit', 'new:wallet', 'new:transfer', 'master', 'visa']);
  });

  it('un medio al contado que ya existe ocupa su lugar, con su nombre: no se crea otro', () => {
    const billetera: PaymentMethod = {
      id: 'mp',
      kind: 'wallet',
      name: 'Mercado Pago',
      closingDay: null,
      dueDay: null,
    };

    expect(paymentOptions([visa, billetera])[2]).toEqual({
      key: 'mp',
      kind: 'wallet',
      name: 'Mercado Pago',
      methodId: 'mp',
    });
  });

  it('"otro" y los repetidos no se pierden: van antes de las tarjetas', () => {
    const otro: PaymentMethod = { id: 'otro', kind: 'other', name: 'Vale', closingDay: null, dueDay: null };
    const debito1: PaymentMethod = { id: 'd1', kind: 'debit', name: 'Débito', closingDay: null, dueDay: null };
    const debito2: PaymentMethod = { id: 'd2', kind: 'debit', name: 'Débito BBVA', closingDay: null, dueDay: null };

    const keys = paymentOptions([visa, otro, debito1, debito2]).map((option) => option.key);
    expect(keys).toEqual(['new:cash', 'd1', 'new:wallet', 'new:transfer', 'otro', 'd2', 'visa']);
  });
});
