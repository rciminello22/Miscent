/**
 * Los fijos con nombre propio (12/10).
 *
 * "Luz" y "Gas" son los dos de la categoría Servicios, y "Monotributo" es de
 * Impuestos. Sin la descripción, en Inicio y en Futuro se veían como
 * "Servicios", "Servicios" e "Impuestos", y no había forma de distinguirlos.
 */

import { describe, it, expect } from 'vitest';
import { alreadyInSpaces } from '../duplicates';
import { expandPersonalOccurrences, expandSpaceOccurrences } from '../occurrences';
import {
  MARTINA,
  RENZO,
  membership,
  personalFacts,
  personalRecurrence,
  sharedRecurrence,
  spaceFacts,
} from './fixtures';

const HORIZON = { from: '2026-10', to: '2026-10' } as const;

describe('el nombre de un fijo', () => {
  it('un fijo personal se llama por su descripción', () => {
    const luz = personalRecurrence({
      kind: 'expense',
      amount: 40_000,
      dayOfMonth: 15,
      startMonth: '2026-10',
      category: 'servicios',
      description: 'Luz',
    });

    const [occurrence] = expandPersonalOccurrences(
      personalFacts({ recurrences: [luz] }),
      HORIZON,
    ).occurrences;

    expect(occurrence?.label).toBe('Luz');
  });

  it('un fijo compartido también, en el espacio', () => {
    const gas = sharedRecurrence({
      amount: 30_000,
      dayOfMonth: 10,
      startMonth: '2026-10',
      payerSlot: RENZO,
      category: 'servicios',
      description: 'Gas',
    });

    const [occurrence] = expandSpaceOccurrences(spaceFacts({ recurrences: [gas] }), HORIZON);

    expect(occurrence?.label).toBe('Gas');
  });

  it('sin descripción, sigue siendo su categoría: los fijos de antes no cambian', () => {
    const viejo = personalRecurrence({
      kind: 'expense',
      amount: 40_000,
      dayOfMonth: 15,
      startMonth: '2026-10',
      category: 'servicios',
    });

    const [occurrence] = expandPersonalOccurrences(
      personalFacts({ recurrences: [viejo] }),
      HORIZON,
    ).occurrences;

    expect(occurrence?.label).toBe('servicios');
  });

  it('CA-09 · "Ya en Casa" lleva la descripción, para decir CUÁL fijo es', () => {
    const luz = sharedRecurrence({
      amount: 40_000,
      dayOfMonth: 15,
      startMonth: '2026-10',
      payerSlot: RENZO,
      category: 'servicios',
      description: 'Luz',
    });

    const result = alreadyInSpaces(
      [membership({ facts: spaceFacts({ recurrences: [luz] }), mySlot: MARTINA })],
      '2026-10-07',
    );

    expect(result.fixed[0]).toMatchObject({ category: 'servicios', description: 'Luz' });
  });
});
