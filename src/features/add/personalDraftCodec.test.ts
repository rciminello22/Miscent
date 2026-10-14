import { describe, it, expect } from 'vitest';
import { decodePersonalDraft, encodePersonalDraft } from './personalDraftCodec';

/**
 * Caso 18 · "Si crea la cuenta, el borrador se guarda como personal al
 * terminar". El borrador sobrevive el viaje por O3 (y, sin email, por
 * guardar el acceso): se guarda serializado.
 */
describe('Caso 18 · el borrador de la invitada', () => {
  const draft = { amount: 25_000, category: 'farmacia' as const, date: '2026-10-14', description: 'Remedios' };

  it('ida y vuelta', () => {
    expect(decodePersonalDraft(encodePersonalDraft(draft))).toEqual(draft);
  });

  it('sin categoría elegida queda en "otros": el monto es lo que no se pierde', () => {
    const decoded = decodePersonalDraft(encodePersonalDraft({ ...draft, category: null }));
    expect(decoded?.category).toBe('otros');
  });

  it('sin descripción, null', () => {
    expect(decodePersonalDraft(encodePersonalDraft({ ...draft, description: '  ' }))?.description).toBeNull();
  });

  it('un borrador sin monto no es un borrador', () => {
    expect(encodePersonalDraft({ ...draft, amount: 0 })).toBeNull();
  });

  it('algo ilegible no se adivina', () => {
    expect(decodePersonalDraft(null)).toBeNull();
    expect(decodePersonalDraft('{roto')).toBeNull();
    expect(decodePersonalDraft(JSON.stringify({ amount: 'mucho' }))).toBeNull();
  });
});
