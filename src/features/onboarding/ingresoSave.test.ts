import { describe, expect, it } from 'vitest';
import { incomeSaveAction, type IncomeDraft } from './ingresoSave';

const sueldo: IncomeDraft = { amount: 1_000_000, dayOfMonth: 5, dayApprox: false };

describe('incomeSaveAction · crear, actualizar o solo seguir', () => {
  it('la primera vez, crea el ingreso', () => {
    expect(incomeSaveAction(null, sueldo)).toEqual({ kind: 'create' });
  });

  it('si ya se creó y no cambió nada, solo navega: no duplica el sueldo', () => {
    const saved = { id: 'r1', draft: sueldo };
    expect(incomeSaveAction(saved, { ...sueldo })).toEqual({ kind: 'navigate' });
  });

  it('si ya se creó y cambió el monto, actualiza ese mismo ingreso', () => {
    const saved = { id: 'r1', draft: sueldo };
    expect(incomeSaveAction(saved, { ...sueldo, amount: 1_200_000 })).toEqual({
      kind: 'update',
      id: 'r1',
    });
  });

  it('si ya se creó y cambió el día, actualiza', () => {
    const saved = { id: 'r1', draft: sueldo };
    expect(incomeSaveAction(saved, { ...sueldo, dayOfMonth: 10 })).toEqual({
      kind: 'update',
      id: 'r1',
    });
  });

  it('si ya se creó y el día pasó de exacto a aproximado, actualiza', () => {
    const saved = { id: 'r1', draft: sueldo };
    expect(incomeSaveAction(saved, { ...sueldo, dayApprox: true })).toEqual({
      kind: 'update',
      id: 'r1',
    });
  });
});
