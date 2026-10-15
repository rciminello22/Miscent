import { describe, it, expect } from 'vitest';
import {
  debito,
  membership,
  personalFacts,
  RENZO,
  sharedExpense,
  spaceFacts,
  visa,
} from '@domain/__tests__/fixtures';
import { onboardingBranches, onboardingProgress, type OnboardingStep } from './onboardingProgress';

/**
 * UX-22 · la barra de O3 cuenta los pasos que de verdad se recorren.
 *
 * Antes marcaba "4 de 5" en el último paso (el marco no se usaba en `listo`),
 * dos pantallas compartían el "3" y, sin tarjetas, el total mentía.
 */
const noBranches = { hasCards: false, hasPaidByMe: false };

describe('onboardingProgress · sin ramas', () => {
  it('sin tarjetas se saltea Deuda: son tres pasos', () => {
    expect(onboardingProgress('ingreso', noBranches)).toEqual({ step: 1, total: 3 });
    expect(onboardingProgress('tarjetas', noBranches)).toEqual({ step: 2, total: 3 });
    expect(onboardingProgress('fijos', noBranches)).toEqual({ step: 3, total: 3 });
  });
});

describe('onboardingProgress · con tarjetas', () => {
  const withCards = { hasCards: true, hasPaidByMe: false };

  it('suma Deuda', () => {
    expect(onboardingProgress('ingreso', withCards)).toEqual({ step: 1, total: 4 });
    expect(onboardingProgress('tarjetas', withCards)).toEqual({ step: 2, total: 4 });
    expect(onboardingProgress('deuda', withCards)).toEqual({ step: 3, total: 4 });
    expect(onboardingProgress('fijos', withCards)).toEqual({ step: 4, total: 4 });
  });
});

describe('onboardingProgress · quien activa la cuenta viniendo de invitado', () => {
  const all = { hasCards: true, hasPaidByMe: true };

  it('Deuda y Pagados son pasos distintos: nadie comparte número', () => {
    expect(onboardingProgress('deuda', all)).toEqual({ step: 3, total: 5 });
    expect(onboardingProgress('conQue', all)).toEqual({ step: 4, total: 5 });
    expect(onboardingProgress('fijos', all)).toEqual({ step: 5, total: 5 });
  });
});

describe('onboardingBranches · qué ramas tiene este usuario', () => {
  const today = '2026-10-14';

  it('hasCards mira las tarjetas de crédito, no otros medios', () => {
    expect(onboardingBranches(personalFacts({ paymentMethods: [visa] }), today).hasCards).toBe(true);
    expect(onboardingBranches(personalFacts({ paymentMethods: [debito] }), today).hasCards).toBe(
      false,
    );
  });

  it('hasPaidByMe: gastos de un espacio que pagó él y quedaron sin medio', () => {
    const withExpense = membership({
      facts: spaceFacts({
        expenses: [sharedExpense({ amount: 40_000, date: '2026-10-10', payerSlot: RENZO })],
      }),
      mySlot: RENZO,
    });
    expect(
      onboardingBranches(personalFacts({ spaces: [withExpense] }), today).hasPaidByMe,
    ).toBe(true);
    expect(onboardingBranches(personalFacts(), today).hasPaidByMe).toBe(false);
  });
});

describe('onboardingProgress · invariantes', () => {
  const steps: OnboardingStep[] = ['ingreso', 'tarjetas', 'deuda', 'conQue', 'fijos'];
  const flags = [false, true];

  it('el último paso llena la barra: nunca "4 de 5" al final', () => {
    for (const hasCards of flags) {
      for (const hasPaidByMe of flags) {
        const last = onboardingProgress('fijos', { hasCards, hasPaidByMe });
        expect(last.step).toBe(last.total);
      }
    }
  });

  it('dos pasos distintos nunca comparten número', () => {
    for (const hasCards of flags) {
      for (const hasPaidByMe of flags) {
        const present = steps.filter(
          (step) =>
            (step !== 'deuda' || hasCards) && (step !== 'conQue' || hasPaidByMe),
        );
        const numbers = present.map(
          (step) => onboardingProgress(step, { hasCards, hasPaidByMe }).step,
        );
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    }
  });

  it('una pantalla que se muestra cuenta como paso aunque la rama no lo haya anticipado', () => {
    expect(onboardingProgress('deuda', noBranches)).toEqual({ step: 3, total: 4 });
    expect(onboardingProgress('conQue', noBranches)).toEqual({ step: 3, total: 4 });
  });
});
