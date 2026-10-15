import { describe, expect, it } from 'vitest';
import { hasUnsavedChanges, type EditFormValues } from './editForm';

/**
 * UX-18 · cuándo hay cambios sin guardar en la edición de un gasto. TS puro.
 */

const BASE: EditFormValues = {
  amount: 12_000,
  date: '2026-10-10',
  category: 'supermercado',
  paymentMethodId: 'visa',
  installmentCount: null,
  description: 'Coto',
};

const SHARED: EditFormValues = {
  ...BASE,
  payerIsMe: true,
  split: { mode: 'even' },
};

describe('hasUnsavedChanges · movimiento personal', () => {
  it('lo que se abrió, sin tocar, no tiene cambios', () => {
    expect(hasUnsavedChanges(BASE, { ...BASE })).toBe(false);
  });

  it('cambiar cualquier campo es un cambio', () => {
    expect(hasUnsavedChanges(BASE, { ...BASE, amount: 13_000 })).toBe(true);
    expect(hasUnsavedChanges(BASE, { ...BASE, date: '2026-10-09' })).toBe(true);
    expect(hasUnsavedChanges(BASE, { ...BASE, category: 'transporte' })).toBe(true);
    expect(hasUnsavedChanges(BASE, { ...BASE, paymentMethodId: null })).toBe(true);
    expect(hasUnsavedChanges(BASE, { ...BASE, installmentCount: 6 })).toBe(true);
    expect(hasUnsavedChanges(BASE, { ...BASE, description: 'Carrefour' })).toBe(true);
  });

  it('los espacios de los costados de la descripción no cuentan', () => {
    expect(hasUnsavedChanges(BASE, { ...BASE, description: '  Coto ' })).toBe(false);
  });

  it('sin descripción es lo mismo que una descripción vacía', () => {
    const sinDescripcion = { ...BASE, description: '' };
    expect(hasUnsavedChanges(sinDescripcion, { ...sinDescripcion, description: '   ' })).toBe(false);
  });

  it('escribir algo donde no había nada es un cambio', () => {
    const sinDescripcion = { ...BASE, description: '' };
    expect(hasUnsavedChanges(sinDescripcion, { ...sinDescripcion, description: 'Coto' })).toBe(true);
  });

  it('volver al valor original deshace el cambio', () => {
    expect(hasUnsavedChanges(BASE, { ...BASE, amount: BASE.amount })).toBe(false);
  });
});

describe('hasUnsavedChanges · gasto compartido', () => {
  it('sin tocar, sin cambios', () => {
    expect(hasUnsavedChanges(SHARED, { ...SHARED })).toBe(false);
  });

  it('cambiar quién pagó es un cambio', () => {
    expect(hasUnsavedChanges(SHARED, { ...SHARED, payerIsMe: false })).toBe(true);
  });

  it('pasar de 50/50 a personalizado es un cambio', () => {
    expect(
      hasUnsavedChanges(SHARED, {
        ...SHARED,
        split: { mode: 'custom', shareSlot1: 6_000, shareSlot2: 6_000 },
      }),
    ).toBe(true);
  });

  it('un reparto personalizado igual al de antes no es un cambio', () => {
    const custom = {
      ...SHARED,
      split: { mode: 'custom', shareSlot1: 7_000, shareSlot2: 5_000 } as const,
    };
    expect(hasUnsavedChanges(custom, { ...custom, split: { ...custom.split } })).toBe(false);
  });

  it('mover una parte del reparto personalizado es un cambio', () => {
    const custom = {
      ...SHARED,
      split: { mode: 'custom', shareSlot1: 7_000, shareSlot2: 5_000 } as const,
    };
    expect(
      hasUnsavedChanges(custom, {
        ...custom,
        split: { mode: 'custom', shareSlot1: 8_000, shareSlot2: 4_000 },
      }),
    ).toBe(true);
  });
});
