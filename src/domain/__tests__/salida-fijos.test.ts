/**
 * SA-04 · §27 · Caso 13 · después de una salida, quien queda decide sobre
 * cada fijo compartido que se detuvo: "¿Lo seguís pagando vos?".
 */

import { describe, it, expect } from 'vitest';
import { pendingStoppedFixed } from '../departure';
import type { Member } from '../types';
import { MARTINA, RENZO, casa, sharedRecurrence, spaceFacts } from './fixtures';

const exMartina: Member = {
  slot: MARTINA,
  userId: null,
  displayName: 'Martina',
  status: 'former',
  isCreator: false,
};

const renzo: Member = {
  slot: RENZO,
  userId: 'renzo',
  displayName: 'Renzo',
  status: 'active',
  isCreator: true,
};

const detenido = {
  ...sharedRecurrence({
    id: 'alquiler',
    amount: 500_000,
    dayOfMonth: 10,
    startMonth: '2026-01',
    payerSlot: RENZO,
    endMonth: '2026-10',
  }),
  stoppedByDepartureOn: '2026-10-13',
};

const casaSinMartina = casa({ members: [renzo, exMartina] });

describe('SA-04 · los fijos que quedan por decidir', () => {
  it('Caso 12 · Renzo ve la pregunta sobre el alquiler, con el nombre de quien salió', () => {
    const pending = pendingStoppedFixed(
      spaceFacts({ space: casaSinMartina, recurrences: [detenido] }),
      RENZO,
    );

    expect(pending).toEqual([
      {
        recurrenceId: 'alquiler',
        category: 'alquiler',
        description: null,
        amount: 500_000,
        endMonth: '2026-10',
        otherName: 'Martina',
      },
    ]);
  });

  it('una vez decidido, no se vuelve a preguntar', () => {
    const pending = pendingStoppedFixed(
      spaceFacts({
        space: casaSinMartina,
        recurrences: [{ ...detenido, departureResolution: 'moved' }],
      }),
      RENZO,
    );
    expect(pending).toEqual([]);
  });

  it('un fijo que terminó solo, sin una salida, no se pregunta', () => {
    const terminado = { ...detenido, stoppedByDepartureOn: null };
    const pending = pendingStoppedFixed(
      spaceFacts({ space: casaSinMartina, recurrences: [terminado] }),
      RENZO,
    );
    expect(pending).toEqual([]);
  });

  it('quien salió no decide: ya no tiene acceso al espacio (SA-02)', () => {
    const pending = pendingStoppedFixed(
      spaceFacts({ space: casaSinMartina, recurrences: [detenido] }),
      MARTINA,
    );
    expect(pending).toEqual([]);
  });
});
