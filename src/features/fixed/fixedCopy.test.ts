import { describe, it, expect } from 'vitest';
import { MARTINA, RENZO, sharedRecurrence } from '@domain/__tests__/fixtures';
import { fixedAuthorLine } from './fixedCopy';

describe('§21 · K3 · la autoría de un fijo compartido, visible', () => {
  const alquiler = sharedRecurrence({ amount: 500_000, dayOfMonth: 1, startMonth: '2026-01', payerSlot: RENZO });

  it('quién lo cargó y quién lo paga', () => {
    expect(fixedAuthorLine({ ...alquiler, createdBySlot: MARTINA }, RENZO, 'Martina')).toBe(
      'Lo cargó Martina · pagás vos',
    );
    expect(fixedAuthorLine({ ...alquiler, createdBySlot: RENZO, payerSlot: MARTINA }, RENZO, 'Martina')).toBe(
      'Lo cargaste vos · paga Martina',
    );
  });

  it('si lo editó el otro, también se dice', () => {
    expect(
      fixedAuthorLine({ ...alquiler, createdBySlot: RENZO, updatedBySlot: MARTINA }, RENZO, 'Martina'),
    ).toBe('Lo cargaste vos · lo editó Martina · pagás vos');
  });

  it('de un fijo de antes no se sabe quién lo cargó: no se inventa', () => {
    expect(fixedAuthorLine({ ...alquiler, createdBySlot: null }, RENZO, 'Martina')).toBe('Pagás vos');
  });
});
