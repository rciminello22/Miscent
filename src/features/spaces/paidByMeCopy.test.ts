import { describe, it, expect } from 'vitest';
import {
  onboardingPaidTitle,
  paidByOtherTitle,
  paidItemLine,
  toCompleteLine,
} from './paidByMeCopy';

describe('"¿Con qué lo pagaste?" · el texto', () => {
  it('en el espacio: dice quién lo cargó, en singular', () => {
    expect(paidByOtherTitle('Martina', 1)).toBe(
      'Martina cargó un gasto que pagaste vos. ¿Con qué lo pagaste?',
    );
  });

  it('y en plural', () => {
    expect(paidByOtherTitle('Martina', 3)).toBe(
      'Martina cargó 3 gastos que pagaste vos. ¿Con qué los pagaste?',
    );
  });

  it('§11 paso 4 · al activar la cuenta, el texto literal de la spec', () => {
    expect(onboardingPaidTitle('Casa')).toBe('Pagaste estos gastos de Casa. ¿Con qué?');
  });

  it('cada gasto: qué, cuándo y cuánto', () => {
    expect(
      paidItemLine({ label: 'Supermercado', date: '2026-10-10', amount: 100_000, installmentCount: null }),
    ).toBe('Supermercado · 10 oct · $100.000');
  });

  it('en cuotas dice cuántas, porque el medio decide cuándo vence cada una', () => {
    expect(
      paidItemLine({ label: 'Heladera', date: '2026-05-20', amount: 600_000, installmentCount: 12 }),
    ).toBe('Heladera · 12 cuotas · $600.000');
  });

  it('Inicio · "Tus espacios"', () => {
    expect(toCompleteLine(1)).toBe('Hay 1 gasto para completar');
    expect(toCompleteLine(2)).toBe('Hay 2 gastos para completar');
  });
});
