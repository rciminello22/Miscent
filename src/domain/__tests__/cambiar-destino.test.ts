/**
 * X-07 · "Cambiar el destino (personal ↔ espacio) solo lo puede hacer quien
 * lo cargó, con confirmación de audiencia." El sentido personal → espacio ya
 * existía; este es el otro: un gasto cargado en un espacio por error (§32).
 */

import { describe, it, expect } from 'vitest';
import { canMoveToPersonal } from '../destination';
import { MARTINA, RENZO, sharedExpense } from './fixtures';

describe('X-07 · pasar un gasto compartido a personal', () => {
  const mio = { ...sharedExpense({ amount: 10_000, date: '2026-10-05', payerSlot: RENZO }), createdBySlot: RENZO };

  it('quien lo cargó y lo pagó, sí', () => {
    expect(canMoveToPersonal(mio, RENZO)).toBe(true);
  });

  it('lo cargó el otro: no (X-07)', () => {
    expect(canMoveToPersonal({ ...mio, createdBySlot: MARTINA }, RENZO)).toBe(false);
  });

  it('lo pagó el otro: no puede ser un gasto personal mío', () => {
    expect(canMoveToPersonal({ ...mio, payerSlot: MARTINA }, RENZO)).toBe(false);
  });
});
