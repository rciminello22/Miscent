/**
 * §17 · §12 · los avisos después de guardar o eliminar.
 *
 * §12 los pone entre los indicadores de audiencia OBLIGATORIOS: "Agregado a
 * Casa · Martina lo ve · Deshacer" al guardar. No es decoración: es lo que
 * evita cargar en un espacio, sin darse cuenta, algo que era personal.
 */

import { describe, it, expect } from 'vitest';
import { deletedTitle, savedTitle, type FeedbackAudience } from './feedbackCopy';

const personal: FeedbackAudience = { kind: 'private' };
const casa = (otherStatus: 'active' | 'no_access' | 'former'): FeedbackAudience => ({
  kind: 'shared',
  spaceName: 'Casa',
  otherName: 'Martina',
  otherStatus,
});

describe('al guardar', () => {
  it('§17 · personal: "Guardado · Solo vos lo ves"', () => {
    expect(savedTitle(personal)).toBe('Guardado · Solo vos lo ves');
  });

  it('§12 · en un espacio: "Agregado a Casa · Martina lo ve"', () => {
    expect(savedTitle(casa('active'))).toBe('Agregado a Casa · Martina lo ve');
  });

  it('Modo 1 · si Martina todavía no entró, no lo ve HOY: lo va a ver cuando entre (I-04)', () => {
    expect(savedTitle(casa('no_access'))).toBe('Agregado a Casa · Martina lo va a ver cuando entre');
  });

  it('un ex miembro ya no ve nada del espacio: no se le promete que lo ve', () => {
    expect(savedTitle(casa('former'))).toBe('Agregado a Casa');
  });
});

describe('al eliminar', () => {
  it('personal: el radar se recalcula sin él (X-01)', () => {
    expect(deletedTitle(personal)).toBe('Eliminado · Tu radar ya no lo cuenta');
  });

  it('X-03 · en un espacio: "el otro también deja de verlo"', () => {
    expect(deletedTitle(casa('active'))).toBe('Eliminado de Casa · Martina también deja de verlo');
  });

  it('si el otro no tiene acceso, no hay nadie que deje de verlo', () => {
    expect(deletedTitle(casa('no_access'))).toBe('Eliminado de Casa');
    expect(deletedTitle(casa('former'))).toBe('Eliminado de Casa');
  });
});
