import { describe, it, expect } from 'vitest';
import { fromPastTerms, toPastTerms } from './pastTerms';

describe('F-03 · los tramos de un fijo, de la base al dominio', () => {
  it('lee los tramos de un fijo compartido y de uno personal', () => {
    expect(
      toPastTerms([
        { until: '2026-09', amount: 500_000, split: { mode: 'custom', shareSlot1: 300_000, shareSlot2: 200_000 } },
        { until: '2026-05', amount: 450_000, split: { mode: 'even' } },
        { until: '2026-02', amount: 30_000, split: null },
      ]),
    ).toEqual([
      { until: '2026-02', amount: 30_000, split: null },
      { until: '2026-05', amount: 450_000, split: { mode: 'even' } },
      { until: '2026-09', amount: 500_000, split: { mode: 'custom', shareSlot1: 300_000, shareSlot2: 200_000 } },
    ]);
  });

  it('un fijo sin cambios no tiene tramos', () => {
    expect(toPastTerms([])).toEqual([]);
  });

  it('un tramo mal formado NO se ignora: sería un monto equivocado sin aviso', () => {
    expect(() => toPastTerms([{ until: '2026-09' }])).toThrow();
    expect(() => toPastTerms({})).toThrow();
  });

  it('ida y vuelta', () => {
    const terms = [{ until: '2026-09', amount: 500_000, split: { mode: 'even' as const } }];
    expect(toPastTerms(fromPastTerms(terms))).toEqual(terms);
  });
});
