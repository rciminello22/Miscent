import { describe, it, expect } from 'vitest';
import { formatPesos } from '@/lib/format';
import { amountSpeech, signOf, signedKindOf } from '../amountSign';

/**
 * 15 · la regla de signos de toda la app. "−" sale, "+" entra, y solo lo que
 * entra lleva color. El lector de pantalla nunca dice "menos" ni "más".
 */

const row = (kind: string, paymentDirection: 'received' | 'sent' | null = null) =>
  ({ kind, paymentDirection }) as Parameters<typeof signedKindOf>[0];

describe('signOf · qué signo lleva cada tipo de movimiento', () => {
  it('un gasto sale', () => {
    expect(signOf('expense')).toBe('out');
  });

  it('un ingreso entra', () => {
    expect(signOf('income')).toBe('in');
  });

  it('un pago entre miembros depende de quién mira: te pagaron entra, pagaste sale', () => {
    expect(signOf('payment-received')).toBe('in');
    expect(signOf('payment-sent')).toBe('out');
  });
});

describe('signedKindOf · el tipo de una fila de Movimientos', () => {
  it('personal-income entra; personal-expense y shared-expense salen', () => {
    expect(signOf(signedKindOf(row('personal-income')))).toBe('in');
    expect(signOf(signedKindOf(row('personal-expense')))).toBe('out');
    expect(signOf(signedKindOf(row('shared-expense')))).toBe('out');
  });

  it('member-payment: la dirección es la del usuario que mira', () => {
    expect(signOf(signedKindOf(row('member-payment', 'received')))).toBe('in');
    expect(signOf(signedKindOf(row('member-payment', 'sent')))).toBe('out');
  });
});

describe('amountSpeech · lo que lee el lector de pantalla', () => {
  it('"gasto de $4.500", "ingreso de $1.200.000", "te pagaron $20.000", "pagaste $20.000"', () => {
    expect(amountSpeech('expense', 4_500, formatPesos)).toBe('gasto de $4.500');
    expect(amountSpeech('income', 1_200_000, formatPesos)).toBe('ingreso de $1.200.000');
    expect(amountSpeech('payment-received', 20_000, formatPesos)).toBe('te pagaron $20.000');
    expect(amountSpeech('payment-sent', 20_000, formatPesos)).toBe('pagaste $20.000');
  });

  it('nunca dice "menos" ni "más" ni lleva el símbolo', () => {
    for (const kind of ['expense', 'income', 'payment-received', 'payment-sent'] as const) {
      const spoken = amountSpeech(kind, 4_500, formatPesos);
      expect(spoken).not.toMatch(/menos|más|[+−-]/);
    }
  });
});
