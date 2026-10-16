import { describe, it, expect } from 'vitest';
import type { CardDaysPlan } from '@domain/cardDays';
import { visa } from '@domain/__tests__/fixtures';
import type { PaymentMethod } from '@domain/types';
import {
  canSaveDraft,
  cardEditOf,
  dayBefore,
  daysChanged,
  draftFromCard,
  editedCard,
  editNote,
  recalculatedDetail,
  updatedTitle,
  type CardDraft,
} from './cardDaysEdit';

/** Cierra ~15 y vence ~2: los dos de un "Más o menos". */
const aproximada: PaymentMethod = {
  ...visa,
  closingDay: 15,
  dueDay: 2,
  closingApprox: true,
  dueApprox: true,
};

describe('draftFromCard', () => {
  it('abre con lo guardado: el día exacto, el "Más o menos" y el "No sé"', () => {
    const draft = draftFromCard({ ...visa, closingDay: 25, dueDay: null });

    expect(draft.name).toBe('Visa Galicia');
    expect(draft.closing).toEqual({ mode: 'exact', day: 25 });
    expect(draft.due).toEqual({ mode: 'unknown', day: null });
    expect(draftFromCard(aproximada).closing).toEqual({ mode: 'approx', day: 15 });
  });

  it('"Ya sé el día exacto": abre en "Sé el día" y sin día SOLO los días aproximados', () => {
    const mixta = { ...aproximada, dueDay: 5, dueApprox: false };

    const draft = draftFromCard(mixta, { knowExactDay: true });

    expect(draft.closing).toEqual({ mode: 'exact', day: null });
    expect(draft.due).toEqual({ mode: 'exact', day: 5 });
  });
});

describe('editedCard', () => {
  it('la tarjeta con el nombre y los días que se eligieron, con su marca', () => {
    const draft: CardDraft = {
      name: '  Visa Plata ',
      closing: { mode: 'exact', day: 25 },
      due: { mode: 'approx', day: 2 },
    };

    expect(editedCard(visa, draft)).toEqual({
      ...visa,
      name: 'Visa Plata',
      closingDay: 25,
      closingApprox: false,
      dueDay: 2,
      dueApprox: true,
    });
  });

  it('"No sé" es una respuesta: queda sin día y sin marca', () => {
    const draft: CardDraft = {
      name: 'Visa',
      closing: { mode: 'unknown', day: null },
      due: { mode: 'exact', day: 5 },
    };

    expect(editedCard(aproximada, draft)).toMatchObject({
      closingDay: null,
      closingApprox: false,
      dueDay: 5,
    });
  });

  it('con un día todavía sin elegir no hay tarjeta nueva', () => {
    const draft = draftFromCard(aproximada, { knowExactDay: true });

    expect(editedCard(aproximada, draft)).toBeNull();
  });
});

describe('daysChanged y canSaveDraft', () => {
  it('sin tocar nada no hay cambios ni se puede guardar', () => {
    const draft = draftFromCard(aproximada);

    expect(daysChanged(aproximada, draft)).toBe(false);
    expect(canSaveDraft(aproximada, draft)).toBe(false);
  });

  it('solo el nombre: se puede guardar y los días no cambiaron', () => {
    const draft = { ...draftFromCard(visa), name: 'Visa Plata' };

    expect(daysChanged(visa, draft)).toBe(false);
    expect(canSaveDraft(visa, draft)).toBe(true);
  });

  it('un nombre vacío no se guarda', () => {
    expect(canSaveDraft(visa, { ...draftFromCard(visa), name: '   ' })).toBe(false);
  });

  it('pasar de "~15" al 15 exacto es un cambio, aunque el número sea el mismo', () => {
    const draft = { ...draftFromCard(aproximada), closing: { mode: 'exact', day: 15 } as const };

    expect(daysChanged(aproximada, draft)).toBe(true);
    expect(canSaveDraft(aproximada, draft)).toBe(true);
  });

  it('con un día sin elegir no se guarda, aunque haya cambiado otra cosa', () => {
    const draft = { ...draftFromCard(aproximada, { knowExactDay: true }), name: 'Otro' };

    expect(canSaveDraft(aproximada, draft)).toBe(false);
  });
});

describe('dayBefore · "Antes: ~15"', () => {
  it('lo de antes, con "~" si era aproximado, debajo del día que cambió', () => {
    expect(dayBefore({ day: 15, approx: true }, { mode: 'exact', day: 25 })).toBe('Antes: ~15');
    expect(dayBefore({ day: 25, approx: false }, { mode: 'approx', day: 15 })).toBe('Antes: 25');
    expect(dayBefore({ day: null, approx: false }, { mode: 'exact', day: 5 })).toBe(
      'Antes: sin dato',
    );
  });

  it('mientras se elige el día exacto de uno aproximado, ya muestra el de antes', () => {
    expect(dayBefore({ day: 15, approx: true }, { mode: 'exact', day: null })).toBe('Antes: ~15');
  });

  it('si el día no cambió no se dice nada', () => {
    expect(dayBefore({ day: 15, approx: true }, { mode: 'approx', day: 15 })).toBeNull();
    expect(dayBefore({ day: 25, approx: false }, { mode: 'exact', day: 25 })).toBeNull();
    expect(dayBefore({ day: null, approx: false }, { mode: 'unknown', day: null })).toBeNull();
  });

  it('sin responder todavía no se dice nada', () => {
    expect(dayBefore({ day: 15, approx: true }, { mode: null, day: null })).toBeNull();
  });
});

describe('cardEditOf', () => {
  it('lo que se vuelve a escribir al deshacer: el nombre y los dos días con su marca', () => {
    expect(cardEditOf(aproximada)).toEqual({
      name: 'Visa Galicia',
      closingDay: 15,
      closingApprox: true,
      dueDay: 2,
      dueApprox: true,
    });
  });
});

describe('lo que se le dice al usuario', () => {
  const sinNada: CardDaysPlan = { items: [], writes: [], fromMonth: null, pastMonthShifts: 0 };
  const conAlgo: CardDaysPlan = {
    items: [
      {
        key: 'movement:x',
        kind: 'purchase',
        label: 'Zapas',
        spaceName: null,
        otherMemberName: null,
        installment: null,
        before: { month: '2026-12', date: '2026-12-02', approx: true },
        after: { month: '2026-11', date: '2026-11-05', approx: false },
      },
    ],
    writes: [],
    fromMonth: '2026-11',
    pastMonthShifts: 0,
  };

  it('la nota de la edición: se recalcula de este mes en adelante, y no cambia el pasado', () => {
    expect(editNote({ daysChanged: false, plan: sinNada })).toBe(
      'Al cambiar los días se recalculan los pagos de este mes en adelante. Los meses pasados no cambian.',
    );
    expect(editNote({ daysChanged: true, plan: conAlgo })).toBe(
      'Al cambiar los días se recalculan los pagos de este mes en adelante. Los meses pasados no cambian.',
    );
  });

  it('si cambian los días y no hay pagos por venir, lo dice', () => {
    expect(editNote({ daysChanged: true, plan: sinNada })).toBe(
      'Esta tarjeta no tiene pagos por venir: no hay nada para recalcular.',
    );
  });

  it('el aviso de después de guardar', () => {
    expect(updatedTitle('Visa Galicia')).toBe('Visa Galicia actualizada');
    expect(recalculatedDetail(3)).toBe('3 pagos recalculados');
    expect(recalculatedDetail(1)).toBe('1 pago recalculado');
    expect(recalculatedDetail(0)).toBeNull();
  });
});
