import { describe, it, expect } from 'vitest';
import type { CardDaysChangeItem, CardDaysPlan } from '@domain/cardDays';
import { sharedDatesNotes } from '@/features/spaces/sharedDatesNotes';
import { sheetRows, sheetTitle } from './cardDaysChanges';

const zapatillas: CardDaysChangeItem = {
  key: 'movement:zapatillas',
  kind: 'installments',
  label: 'Zapatillas',
  spaceName: null,
  otherMemberName: null,
  installment: { index: 3, count: 6 },
  before: { month: '2026-12', date: '2026-12-02', approx: true },
  after: { month: '2026-12', date: '2026-12-05', approx: false },
};

const heladera: CardDaysChangeItem = {
  key: 'sharedExpense:heladera',
  kind: 'installments',
  label: 'Heladera',
  spaceName: 'Casa',
  otherMemberName: 'Martina',
  installment: { index: 2, count: 6 },
  before: { month: '2026-12', date: '2026-12-02', approx: true },
  after: { month: '2026-12', date: '2026-12-05', approx: false },
};

const netflix: CardDaysChangeItem = {
  key: 'recurrence:netflix',
  kind: 'fixed',
  label: 'Netflix',
  spaceName: null,
  otherMemberName: null,
  installment: null,
  before: { month: '2026-12', date: '2026-12-02', approx: true },
  after: { month: '2026-12', date: '2026-12-05', approx: false },
};

const zapas: CardDaysChangeItem = {
  key: 'movement:zapas',
  kind: 'purchase',
  label: 'Zapas',
  spaceName: null,
  otherMemberName: null,
  installment: null,
  before: { month: '2026-12', date: '2026-12-02', approx: true },
  after: { month: '2026-11', date: '2026-11-05', approx: false },
};

function planOf(items: CardDaysChangeItem[], fromMonth = '2026-11'): CardDaysPlan {
  return { items, writes: [], fromMonth };
}

describe('sheetTitle', () => {
  it('"Se recalculan N pagos de [mes] en adelante"', () => {
    expect(sheetTitle(planOf([zapatillas, heladera, netflix]), '2026-10')).toBe(
      'Se recalculan 3 pagos de noviembre en adelante',
    );
  });

  it('con un solo pago, en singular', () => {
    expect(sheetTitle(planOf([zapas]), '2026-10')).toBe(
      'Se recalcula 1 pago de noviembre en adelante',
    );
  });

  it('si arranca este mes, lo dice así', () => {
    expect(sheetTitle(planOf([zapas], '2026-10'), '2026-10')).toBe(
      'Se recalcula 1 pago de este mes en adelante',
    );
  });

  it('un mes de otro año lleva el año', () => {
    expect(sheetTitle(planOf([zapas], '2027-01'), '2026-10')).toBe(
      'Se recalcula 1 pago de enero de 2027 en adelante',
    );
  });
});

describe('sheetRows · antes → ahora', () => {
  it('una cuota: la que toca, el día de antes con "~" y el de ahora, y que las que siguen se mueven igual', () => {
    expect(sheetRows([zapatillas])).toEqual([
      {
        key: 'movement:zapatillas',
        kind: 'installments',
        shared: false,
        title: 'Zapatillas · cuota 3 de 6',
        caption: '~2 dic → 5 dic · las que siguen se mueven igual',
      },
    ]);
  });

  it('una compra de un espacio lleva el nombre del espacio', () => {
    expect(sheetRows([heladera])[0]).toMatchObject({
      shared: true,
      title: 'Heladera · Casa · cuota 2 de 6',
    });
  });

  it('la última cuota no dice que las que siguen se mueven', () => {
    const ultima = { ...zapatillas, installment: { index: 6, count: 6 } };

    expect(sheetRows([ultima])[0]?.caption).toBe('~2 dic → 5 dic');
  });

  it('un fijo: "· fijo" y sin cuotas', () => {
    expect(sheetRows([netflix])[0]).toMatchObject({
      kind: 'fixed',
      title: 'Netflix · fijo',
      caption: '~2 dic → 5 dic',
    });
  });

  it('una compra en 1 pago que cambia de mes', () => {
    expect(sheetRows([zapas])[0]).toMatchObject({
      kind: 'purchase',
      title: 'Zapas · 1 pago',
      caption: '~2 dic → 5 nov',
    });
  });

  it('T-05 · sin día se dice el mes, nunca una fecha inventada', () => {
    const sinDia = { ...zapas, after: { month: '2026-11', date: null, approx: false } };

    expect(sheetRows([sinDia])[0]?.caption).toBe('~2 dic → noviembre');
  });
});

describe('sharedDatesNotes · el saldo y lo que ve la otra persona', () => {
  it('una nota por persona, con su nombre y sin suponer su género', () => {
    expect(sharedDatesNotes([zapatillas, heladera])).toEqual([
      {
        title: 'El saldo con Martina cambia en la fecha nueva de cada cuota.',
        detail: 'Martina ve las fechas, no la tarjeta.',
      },
    ]);
  });

  it('dos compras con la misma persona, una sola nota', () => {
    expect(sharedDatesNotes([heladera, { ...heladera, key: 'sharedExpense:otra' }])).toHaveLength(1);
  });

  it('dos personas, dos notas', () => {
    const conLeo = { ...heladera, key: 'x', spaceName: 'Viaje', otherMemberName: 'Leo' };

    expect(sharedDatesNotes([heladera, conLeo]).map((note) => note.detail)).toEqual([
      'Martina ve las fechas, no la tarjeta.',
      'Leo ve las fechas, no la tarjeta.',
    ]);
  });

  it('un fijo o una compra en 1 pago de un espacio no mueven el saldo: sin nota', () => {
    const fijoCompartido = { ...netflix, spaceName: 'Casa', otherMemberName: 'Martina' };
    const puntual = { ...zapas, spaceName: 'Casa', otherMemberName: 'Martina' };

    expect(sharedDatesNotes([fijoCompartido, puntual])).toEqual([]);
  });

  it('lo personal no tiene nota', () => {
    expect(sharedDatesNotes([zapatillas, netflix, zapas])).toEqual([]);
  });
});
