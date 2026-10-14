import { describe, it, expect } from 'vitest';
import { MARTINA, RENZO, sharedExpense } from '@domain/__tests__/fixtures';
import { duplicateMessage } from './duplicateCopy';

const label = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);

describe('Should 2 · el aviso de posible duplicado', () => {
  const superMartina = {
    ...sharedExpense({ amount: 100_000, date: '2026-10-05', payerSlot: MARTINA, category: 'supermercado' }),
    createdBySlot: MARTINA,
  };

  it('dice quién lo cargó, qué, cuánto y cuándo', () => {
    expect(duplicateMessage(superMartina, { mySlot: RENZO, otherName: 'Martina', categoryLabel: label })).toBe(
      'Martina ya cargó Supermercado por $100.000 el 5 oct. ¿Es otro gasto?',
    );
  });

  it('si lo cargué yo, en segunda persona', () => {
    expect(
      duplicateMessage({ ...superMartina, createdBySlot: RENZO, description: 'Super' }, {
        mySlot: RENZO,
        otherName: 'Martina',
        categoryLabel: label,
      }),
    ).toBe('Ya cargaste Super por $100.000 el 5 oct. ¿Es otro gasto?');
  });
});
