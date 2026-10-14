/**
 * F-03 · "Cambiar desde este mes" no reescribe el pasado (14/10).
 *
 * El bug: el fijo guardaba un solo monto, y el dominio lo usaba para TODOS los
 * meses. Subir el alquiler de $500.000 a $600.000 en octubre cambiaba también
 * enero..septiembre: el radar de meses cerrados dejaba de coincidir con lo que
 * el usuario vio y, en un fijo compartido, el saldo sumaba $50.000 por cada
 * mes pasado. Justo lo que la pantalla prometía que no pasaba.
 *
 * Ahora el fijo guarda los montos anteriores ("hasta septiembre fue X").
 */

import { describe, it, expect } from 'vitest';
import { changeAmountFrom } from '../fixedChanges';
import { expandPersonalOccurrences, expandSpaceOccurrences } from '../occurrences';
import { RENZO, personalFacts, personalRecurrence, sharedRecurrence, spaceFacts } from './fixtures';

const HORIZON = { from: '2026-08', to: '2026-11' } as const;

function amountsByMonth(occurrences: readonly { month: string; amount?: number; total?: number }[]) {
  return Object.fromEntries(occurrences.map((item) => [item.month, item.amount ?? item.total]));
}

describe('F-03 · "Cambiar desde este mes"', () => {
  const alquiler = sharedRecurrence({
    id: 'alquiler',
    amount: 500_000,
    dayOfMonth: 1,
    startMonth: '2026-01',
    payerSlot: RENZO,
  });

  it('los meses anteriores quedan con el monto de antes; desde este mes, el nuevo', () => {
    const changed = { ...alquiler, ...changeAmountFrom(alquiler, 600_000, '2026-10') };
    const occurrences = expandSpaceOccurrences(spaceFacts({ recurrences: [changed] }), HORIZON);

    expect(amountsByMonth(occurrences)).toEqual({
      '2026-08': 500_000,
      '2026-09': 500_000,
      '2026-10': 600_000,
      '2026-11': 600_000,
    });
  });

  it('cambiarlo dos veces en el mismo mes no pisa el monto de antes', () => {
    const once = { ...alquiler, ...changeAmountFrom(alquiler, 600_000, '2026-10') };
    const twice = { ...once, ...changeAmountFrom(once, 650_000, '2026-10') };
    const occurrences = expandSpaceOccurrences(spaceFacts({ recurrences: [twice] }), HORIZON);

    expect(amountsByMonth(occurrences)['2026-09']).toBe(500_000);
    expect(amountsByMonth(occurrences)['2026-10']).toBe(650_000);
  });

  it('dos aumentos en meses distintos: cada tramo con su monto', () => {
    const agosto = { ...alquiler, ...changeAmountFrom(alquiler, 550_000, '2026-09') };
    const octubre = { ...agosto, ...changeAmountFrom(agosto, 600_000, '2026-11') };
    const occurrences = expandSpaceOccurrences(spaceFacts({ recurrences: [octubre] }), HORIZON);

    expect(amountsByMonth(occurrences)).toEqual({
      '2026-08': 500_000,
      '2026-09': 550_000,
      '2026-10': 550_000,
      '2026-11': 600_000,
    });
  });

  it('un fijo que empieza este mes no guarda nada del pasado: no tiene', () => {
    const nuevo = { ...alquiler, startMonth: '2026-10' };
    expect(changeAmountFrom(nuevo, 600_000, '2026-10').pastTerms).toEqual([]);
  });

  it('con reparto personalizado, las partes nuevas siguen la misma proporción (F-04) y las viejas no cambian', () => {
    const custom = {
      ...alquiler,
      split: { mode: 'custom' as const, shareSlot1: 300_000, shareSlot2: 200_000 },
    };
    const changed = { ...custom, ...changeAmountFrom(custom, 600_000, '2026-10') };

    expect(changed.split).toEqual({ mode: 'custom', shareSlot1: 360_000, shareSlot2: 240_000 });

    const occurrences = expandSpaceOccurrences(spaceFacts({ recurrences: [changed] }), HORIZON);
    const septiembre = occurrences.find((item) => item.month === '2026-09')!;
    // Exacto, sin redondeos: el saldo de un mes pasado no se mueve ni un peso.
    expect(septiembre.shares).toEqual({ slot1: 300_000, slot2: 200_000 });
  });

  it('el saldo de Martina por los meses pasados no cambia', () => {
    const changed = { ...alquiler, ...changeAmountFrom(alquiler, 600_000, '2026-10') };
    const septiembre = expandSpaceOccurrences(spaceFacts({ recurrences: [changed] }), HORIZON).find(
      (item) => item.month === '2026-09',
    )!;
    // Martina (slot 2) sigue debiendo $250.000 por septiembre, no $300.000.
    expect(septiembre.shares).toEqual({ slot1: 250_000, slot2: 250_000 });
  });

  it('también en un fijo personal: el radar de un mes cerrado no cambia', () => {
    const gimnasio = personalRecurrence({
      kind: 'expense',
      amount: 30_000,
      dayOfMonth: 10,
      startMonth: '2026-01',
      category: 'gimnasio',
    });
    const changed = { ...gimnasio, ...changeAmountFrom(gimnasio, 35_000, '2026-10') };
    const { occurrences } = expandPersonalOccurrences(personalFacts({ recurrences: [changed] }), HORIZON);

    expect(amountsByMonth(occurrences)).toEqual({
      '2026-08': 30_000,
      '2026-09': 30_000,
      '2026-10': 35_000,
      '2026-11': 35_000,
    });
  });
});
