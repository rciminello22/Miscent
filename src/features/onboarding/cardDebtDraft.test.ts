import { describe, expect, it } from 'vitest';
import { declaredStatement, movement, personalFacts, visa } from '@domain/__tests__/fixtures';
import {
  cardDebtAlreadySaved,
  cardDebtContinueAction,
  cardDebtDraftKey,
  emptyCardDebtForm,
  isUntouched,
  readCardDebtDraft,
  writeCardDebtDraft,
} from './cardDebtDraft';

describe('cardDebtDraft · H-01, volver atrás no pierde lo escrito ni lo duplica', () => {
  it('lo escrito para una tarjeta vuelve al entrar de nuevo al paso', () => {
    const key = cardDebtDraftKey('u1', 'visa');
    const form = { ...emptyCardDebtForm(), lastPaid: 'no' as const, pendingAmount: 180_000 };
    writeCardDebtDraft(key, form);
    expect(readCardDebtDraft(key)).toEqual(form);
  });

  it('cada usuario y cada tarjeta tienen el suyo', () => {
    writeCardDebtDraft(cardDebtDraftKey('u1', 'visa'), { ...emptyCardDebtForm(), recentSpending: 1 });
    expect(readCardDebtDraft(cardDebtDraftKey('u2', 'visa'))).toBeNull();
    expect(readCardDebtDraft(cardDebtDraftKey('u1', 'master'))).toBeNull();
  });

  it('un formulario intacto es intacto; con cualquier dato, no', () => {
    expect(isUntouched(emptyCardDebtForm())).toBe(true);
    expect(isUntouched({ ...emptyCardDebtForm(), recentSpending: 5_000 })).toBe(false);
    expect(isUntouched({ ...emptyCardDebtForm(), lastPaid: 'no', pendingAmount: 1 })).toBe(false);
  });
});

describe('cardDebtContinueAction · qué hace Continuar', () => {
  it('sin nada guardado, guarda (aunque sea vacío: no hay nada que perder)', () => {
    expect(cardDebtContinueAction({ form: emptyCardDebtForm(), alreadySaved: false })).toBe('save');
  });

  it('ya guardado y el formulario intacto: lo deja como está, NO lo borra', () => {
    expect(cardDebtContinueAction({ form: emptyCardDebtForm(), alreadySaved: true })).toBe('keep');
  });

  it('ya guardado y escribió algo: guarda, y guardar reemplaza', () => {
    const form = { ...emptyCardDebtForm(), recentSpending: 40_000 };
    expect(cardDebtContinueAction({ form, alreadySaved: true })).toBe('save');
  });
});

describe('cardDebtAlreadySaved', () => {
  it('un resumen declarado de esa tarjeta cuenta como guardado', () => {
    const facts = personalFacts({
      declaredStatements: [declaredStatement({ paymentMethodId: visa.id, amount: 1, dueDate: '2026-11-05' })],
    });
    expect(cardDebtAlreadySaved(facts, visa.id)).toBe(true);
    expect(cardDebtAlreadySaved(facts, 'otra')).toBe(false);
  });

  it('las cuotas del onboarding cuentan; un gasto común con la tarjeta, no', () => {
    const comun = movement({ amount: 1_000, date: '2026-10-01', paymentMethodId: visa.id });
    expect(cardDebtAlreadySaved(personalFacts({ movements: [comun] }), visa.id)).toBe(false);
    const delOnboarding = { ...comun, fromOnboardingDebt: true };
    expect(cardDebtAlreadySaved(personalFacts({ movements: [delOnboarding] }), visa.id)).toBe(true);
  });
});
