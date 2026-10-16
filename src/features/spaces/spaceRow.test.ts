import { describe, it, expect } from 'vitest';
import type { SharedBalance } from '@domain/shared-balance';
import { buildSpaceRow } from './spaceRow';

/**
 * 3ii · lo que dice cada fila de la lista de Compartidos. TS puro: la fila
 * solo dibuja lo que sale de acá, con la misma balanza y la misma frase que
 * adentro del espacio.
 */

function balance(amount: number, otherMemberName = 'Martina'): SharedBalance {
  return { amount, viewerSlot: 1, otherMemberName, settled: amount === 0 };
}

const space = {
  id: 'casa',
  name: 'Casa',
  otherMemberName: 'Martina',
  otherHasAccess: true,
  otherIsFormer: false,
};

const active = { displayName: 'Martina', status: 'active' as const };

describe('buildSpaceRow', () => {
  it('el otro te debe: balanza inclinada hacia vos, frase y datos para ordenar', () => {
    const row = buildSpaceRow({
      space,
      myName: 'Renzo',
      scale: { balance: balance(20_000), other: active },
      pending: 0,
      lastOpenedAt: 1_000,
    });

    expect(row.glyph).toMatchObject({ direction: -1, showCheck: false });
    expect(row.sentence).toBe('Martina te debe $20.000');
    expect(row.settled).toBe(false);
    expect(row.item).toEqual({
      id: 'casa',
      name: 'Casa',
      otherName: 'Martina',
      ready: true,
      pending: 0,
      balance: 20_000,
      lastOpenedAt: 1_000,
    });
  });

  it('le debés: inclinada hacia el otro, y el saldo conserva el signo', () => {
    const row = buildSpaceRow({
      space: { ...space, otherMemberName: 'Sofía' },
      myName: 'Renzo',
      scale: {
        balance: balance(-8_500, 'Sofía'),
        other: { displayName: 'Sofía', status: 'active' },
      },
      pending: 1,
      lastOpenedAt: null,
    });

    expect(row.glyph).toMatchObject({ direction: 1, showCheck: false });
    expect(row.sentence).toBe('Le debés $8.500 a Sofía');
    expect(row.item.balance).toBe(-8_500);
    expect(row.pill).toBe('1 por revisar');
  });

  it('están a mano: nivelada con tilde y frase en tono apagado', () => {
    const row = buildSpaceRow({
      space,
      myName: 'Renzo',
      scale: { balance: balance(0), other: active },
      pending: 0,
      lastOpenedAt: null,
    });

    expect(row.glyph).toMatchObject({ direction: 0, showCheck: true });
    expect(row.sentence).toBe('Están a mano');
    expect(row.settled).toBe(true);
    expect(row.pill).toBeNull();
  });

  it('la balanza lleva su descripción para el lector de pantalla', () => {
    const row = buildSpaceRow({
      space,
      myName: 'Renzo',
      scale: { balance: balance(20_000), other: active },
      pending: 0,
      lastOpenedAt: null,
    });

    expect(row.glyph?.label).toBe('Balanza inclinada hacia vos. Martina te debe 20.000 pesos.');
  });

  it('mientras las cuentas no cargaron: sin balanza ni frase, y no se esconde en ningún filtro', () => {
    const row = buildSpaceRow({ space, myName: 'Renzo', scale: null, pending: 0, lastOpenedAt: null });

    expect(row.glyph).toBeNull();
    expect(row.sentence).toBeNull();
    expect(row.loading).toBe(true);
    expect(row.item.ready).toBe(false);
  });

  it('§24 · si el otro todavía no entró lo dice y su avatar es punteado', () => {
    const row = buildSpaceRow({
      space: { ...space, otherMemberName: 'Juan', otherHasAccess: false },
      myName: 'Renzo',
      scale: { balance: balance(0, 'Juan'), other: { displayName: 'Juan', status: 'no_access' } },
      pending: 0,
      lastOpenedAt: null,
    });

    expect(row.note).toBe('Juan todavía no entró');
    expect(row.otherDashed).toBe(true);
    expect(row.former).toBe(false);
  });

  it('§24 · un ex miembro: "ex miembro", fila de borde punteado y avatar sólido', () => {
    const row = buildSpaceRow({
      space: { ...space, otherMemberName: 'Camila', otherHasAccess: false, otherIsFormer: true },
      myName: 'Renzo',
      scale: { balance: balance(0, 'Camila'), other: { displayName: 'Camila', status: 'former' } },
      pending: 0,
      lastOpenedAt: null,
    });

    expect(row.note).toBe('Camila · ex miembro');
    expect(row.former).toBe(true);
    expect(row.otherDashed).toBe(false);
  });

  it('sin nada que aclarar no hay nota', () => {
    const row = buildSpaceRow({
      space,
      myName: 'Renzo',
      scale: { balance: balance(20_000), other: active },
      pending: 0,
      lastOpenedAt: null,
    });

    expect(row.note).toBeNull();
  });

  it('el lector de pantalla lee la fila entera: nombre, frase, pastilla y nota', () => {
    const row = buildSpaceRow({
      space: { ...space, otherMemberName: 'Juan', otherHasAccess: false },
      myName: 'Renzo',
      scale: { balance: balance(0, 'Juan'), other: { displayName: 'Juan', status: 'no_access' } },
      pending: 2,
      lastOpenedAt: null,
    });

    expect(row.accessibilityLabel).toBe('Casa. Están a mano. 2 por revisar. Juan todavía no entró');
  });
});
