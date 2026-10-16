import { describe, it, expect } from 'vitest';
import { formatPesos } from '@/lib/format';
import { installmentsNotice } from './installmentsNotice';

/**
 * §17 · el aviso al guardar una compra en cuotas dice DÓNDE aterrizó: la primera
 * cuota puede caer el mes que viene y, como lo gastado de este mes no cambia
 * (CA-53), sin este aviso parece que no pasó nada. No toca N-02/N-03: solo lo dice
 * y lleva a Futuro con ese mes elegido.
 */
const base = { today: '2026-10-15', formatAmount: formatPesos };

describe('installmentsNotice', () => {
  it('"6 cuotas de $50.000 · la primera suma a noviembre"', () => {
    expect(
      installmentsNotice({ ...base, total: 300_000, count: 6, firstMonth: '2026-11' }),
    ).toEqual({
      detail: '6 cuotas de $50.000 · la primera suma a noviembre',
      month: '2026-11',
    });
  });

  it('Q-01 · si el total no se divide justo, el redondeo va en la primera cuota', () => {
    const notice = installmentsNotice({ ...base, total: 100_000, count: 3, firstMonth: '2026-11' });

    // 100.000 en 3: la primera lleva el centavo de más (Q-01).
    expect(notice?.detail).toBe('3 cuotas de $33.334 · la primera suma a noviembre');
  });

  it('la primera cuota puede ser de este mismo mes', () => {
    expect(
      installmentsNotice({ ...base, total: 120_000, count: 2, firstMonth: '2026-10' })?.detail,
    ).toBe('2 cuotas de $60.000 · la primera suma a octubre');
  });

  it('una primera cuota de otro año lo dice', () => {
    expect(
      installmentsNotice({
        today: '2026-12-20',
        formatAmount: formatPesos,
        total: 120_000,
        count: 2,
        firstMonth: '2027-01',
      })?.detail,
    ).toBe('2 cuotas de $60.000 · la primera suma a enero de 2027');
  });

  it('sin cuotas (un solo pago) no hay aviso', () => {
    expect(installmentsNotice({ ...base, total: 300_000, count: null, firstMonth: null })).toBeNull();
    expect(installmentsNotice({ ...base, total: 300_000, count: 1, firstMonth: '2026-11' })).toBeNull();
  });

  it('sin plan calculado tampoco: nunca inventa un mes', () => {
    expect(installmentsNotice({ ...base, total: 300_000, count: 6, firstMonth: null })).toBeNull();
  });
});
