/**
 * Should 2 · §32 "Los dos cargan el mismo gasto · Aviso de duplicado;
 * cualquiera lo elimina". La app no decide: avisa antes de guardar.
 */

import { describe, it, expect } from 'vitest';
import { possibleDuplicate } from '../duplicates';
import { MARTINA, RENZO, sharedExpense } from './fixtures';

const superMartina = sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-05', payerSlot: MARTINA });

describe('aviso de posible duplicado en un espacio', () => {
  it('mismo monto y fecha cercana: puede ser el mismo gasto', () => {
    expect(possibleDuplicate([superMartina], { amount: 100_000, date: '2026-10-06' })?.id).toBe('super');
  });

  it('hasta 3 días de diferencia, para los dos lados', () => {
    expect(possibleDuplicate([superMartina], { amount: 100_000, date: '2026-10-08' })).not.toBeNull();
    expect(possibleDuplicate([superMartina], { amount: 100_000, date: '2026-10-02' })).not.toBeNull();
    expect(possibleDuplicate([superMartina], { amount: 100_000, date: '2026-10-09' })).toBeNull();
  });

  it('otro monto no es el mismo gasto', () => {
    expect(possibleDuplicate([superMartina], { amount: 100_001, date: '2026-10-05' })).toBeNull();
  });

  it('con varios, el de la fecha más cercana', () => {
    const otro = sharedExpense({ id: 'otro', amount: 100_000, date: '2026-10-07', payerSlot: RENZO });
    expect(possibleDuplicate([superMartina, otro], { amount: 100_000, date: '2026-10-08' })?.id).toBe('otro');
  });
});
