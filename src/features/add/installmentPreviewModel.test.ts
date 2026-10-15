import { describe, expect, it } from 'vitest';
import type { PersonalExpansion } from '@domain/occurrences';
import type { InstallmentPlan } from '@domain/types';
import { buildInstallmentPreview } from './installmentPreviewModel';

/**
 * UX-15 · la vista previa de cuotas sabe si hay algo que mostrar. Si lo hay,
 * es la que cuenta el rango de las cuotas y la pantalla no repite el mensaje
 * de efecto; si no, ese mensaje es lo único que se dice.
 */

const EMPTY: PersonalExpansion = { occurrences: [], incomes: [] };
const TODAY = '2026-10-14';

function plan(firstMonth: string, count: number): InstallmentPlan {
  return { count, firstMonth, impactDay: 5, approximate: false };
}

describe('buildInstallmentPreview', () => {
  it('una compra en 6 cuotas que arrancan el mes que viene muestra los 6 meses', () => {
    const model = buildInstallmentPreview({
      expansion: EMPTY,
      total: 600_000,
      plan: plan('2026-11', 6),
      myShareRatio: 1,
      today: TODAY,
    });

    expect(model).not.toBeNull();
    expect(model!.perMonth).toBe(100_000);
    expect(model!.changed.map((month) => month.month)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
    ]);
    expect(model!.changed[0]).toMatchObject({ committedBefore: 0, committedAfter: 100_000 });
  });

  it('en un gasto compartido cuenta solo la parte de quien mira (K9)', () => {
    const model = buildInstallmentPreview({
      expansion: EMPTY,
      total: 600_000,
      plan: plan('2026-11', 6),
      myShareRatio: 0.5,
      today: TODAY,
    });

    expect(model!.perMonth).toBe(50_000);
  });

  it('si todas las cuotas ya pasaron no hay vista previa', () => {
    const model = buildInstallmentPreview({
      expansion: EMPTY,
      total: 300_000,
      plan: plan('2026-01', 3),
      myShareRatio: 1,
      today: TODAY,
    });

    expect(model).toBeNull();
  });

  it('si la parte propia es cero no hay vista previa', () => {
    const model = buildInstallmentPreview({
      expansion: EMPTY,
      total: 600_000,
      plan: plan('2026-11', 6),
      myShareRatio: 0,
      today: TODAY,
    });

    expect(model).toBeNull();
  });
});
