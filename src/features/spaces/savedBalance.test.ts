import { describe, it, expect } from 'vitest';
import { MARTINA, RENZO, sharedExpense, spaceFacts } from '@domain/__tests__/fixtures';
import { afterSavingSentence, savedBalanceDetail, savedDetail } from './savedBalance';

/**
 * UX-27 · §17 "Compartido → 'Con esto, Martina te debe $20.000'".
 *
 * Es el saldo RESULTANTE (el mismo cálculo del dominio), nunca la diferencia
 * entre lo que pusieron (CA-25). Y solo cuando el gasto cambia el saldo HOY:
 * P2 (cada cuota en su fecha), una fecha futura o un fijo no lo mueven ahora.
 */
const today = '2026-10-14';

const draft = {
  amount: 40_000,
  date: today,
  category: 'supermercado' as const,
  payerSlot: RENZO,
  split: { mode: 'even' as const },
  installmentCount: null,
  repeats: false,
};

describe('afterSavingSentence · "Con esto, …"', () => {
  const base = { viewerSlot: 1 as const, otherMemberName: 'Martina' };

  it('el otro me debe: queda el nombre con mayúscula', () => {
    expect(afterSavingSentence({ ...base, amount: 20_000, settled: false })).toBe(
      'Con esto, Martina te debe $20.000.',
    );
  });

  it('yo le debo al otro: la frase sigue en minúscula', () => {
    expect(afterSavingSentence({ ...base, amount: -20_000, settled: false })).toBe(
      'Con esto, le debés $20.000 a Martina.',
    );
  });

  it('a mano', () => {
    expect(afterSavingSentence({ ...base, amount: 0, settled: true })).toBe(
      'Con esto, están a mano.',
    );
  });
});

describe('savedBalanceDetail · cuándo hay saldo para mostrar', () => {
  it('un gasto puntual de hoy que pagué yo: "Martina te debe la mitad"', () => {
    expect(
      savedBalanceDetail({ facts: spaceFacts(), mySlot: RENZO, today, draft }),
    ).toBe('Con esto, Martina te debe $20.000.');
  });

  it('el mismo gasto, pagado por Martina y visto por Renzo: le debés', () => {
    expect(
      savedBalanceDetail({
        facts: spaceFacts(),
        mySlot: RENZO,
        today,
        draft: { ...draft, payerSlot: MARTINA },
      }),
    ).toBe('Con esto, le debés $20.000 a Martina.');
  });

  it('suma al saldo que ya había (el resultante, no el gasto)', () => {
    const facts = spaceFacts({
      expenses: [sharedExpense({ amount: 100_000, date: '2026-10-01', payerSlot: RENZO })],
    });
    expect(savedBalanceDetail({ facts, mySlot: RENZO, today, draft })).toBe(
      'Con esto, Martina te debe $70.000.',
    );
  });

  it('puede dejarlos a mano', () => {
    const facts = spaceFacts({
      expenses: [sharedExpense({ amount: 40_000, date: '2026-10-01', payerSlot: RENZO })],
    });
    expect(
      savedBalanceDetail({ facts, mySlot: RENZO, today, draft: { ...draft, payerSlot: MARTINA } }),
    ).toBe('Con esto, están a mano.');
  });

  it('una fecha anterior a hoy también cuenta (ya impactó)', () => {
    expect(
      savedBalanceDetail({
        facts: spaceFacts(),
        mySlot: RENZO,
        today,
        draft: { ...draft, date: '2026-10-02' },
      }),
    ).toBe('Con esto, Martina te debe $20.000.');
  });

  it('una fecha futura no cambia el saldo hoy: sin saldo', () => {
    expect(
      savedBalanceDetail({
        facts: spaceFacts(),
        mySlot: RENZO,
        today,
        draft: { ...draft, date: '2026-10-20' },
      }),
    ).toBeNull();
  });

  it('P2 · una compra en cuotas no mueve el saldo el día de la compra: sin saldo', () => {
    expect(
      savedBalanceDetail({
        facts: spaceFacts(),
        mySlot: RENZO,
        today,
        draft: { ...draft, installmentCount: 6 },
      }),
    ).toBeNull();
  });

  it('un fijo no se muestra como saldo: sin saldo', () => {
    expect(
      savedBalanceDetail({
        facts: spaceFacts(),
        mySlot: RENZO,
        today,
        draft: { ...draft, repeats: true },
      }),
    ).toBeNull();
  });

  it('si el saldo no cambia (todo es parte de quien pagó), no se dice "con esto"', () => {
    expect(
      savedBalanceDetail({
        facts: spaceFacts(),
        mySlot: RENZO,
        today,
        draft: { ...draft, split: { mode: 'custom', shareSlot1: 40_000, shareSlot2: 0 } },
      }),
    ).toBeNull();
  });
});

describe('savedDetail · el saldo reemplaza al efecto, que decía lo mismo con menos precisión', () => {
  it('con saldo, va el saldo', () => {
    expect(savedDetail('Con esto, Martina te debe $20.000.', 'Se paga en noviembre.')).toBe(
      'Con esto, Martina te debe $20.000.',
    );
  });

  it('sin saldo, queda el efecto de siempre', () => {
    expect(savedDetail(null, 'Agregás 6 cuotas hasta marzo.')).toBe('Agregás 6 cuotas hasta marzo.');
    expect(savedDetail(null, null)).toBeNull();
  });
});
