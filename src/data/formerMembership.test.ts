import { describe, it, expect } from 'vitest';
import { expandPersonalOccurrences } from '@domain/occurrences';
import { calculateSharedBalance } from '@domain/shared-balance';
import { personalFacts } from '@domain/__tests__/fixtures';
import { toFormerMembership } from './formerMembership';

/**
 * SA-05 · P8 · Caso 14 · P6. Martina sale de Casa el 14/10 con la heladera
 * en cuotas (6 de $100.000, 50/50, pagó Renzo) y el alquiler compartido.
 * Su Futuro sigue con su parte de las cuotas ("Casa · ya no sos miembro") y
 * el alquiler deja de contar.
 */
const expense = {
  id: 'heladera',
  space_id: 'casa',
  amount: 600_000,
  date: '2026-09-10',
  category: 'hogar',
  description: 'Heladera',
  payer_slot: 1,
  split_mode: 'even',
  share_slot_1: 300_000,
  share_slot_2: 300_000,
  installments_count: 6,
  first_installment_month: '2026-10',
  installment_impact_day: 5,
  installments_approximate: false,
  created_by_slot: 1,
  updated_by_slot: 1,
  created_at: '2026-09-10T12:00:00+00:00',
  updated_at: '2026-09-10T12:00:00+00:00',
};

const recurrence = {
  id: 'alquiler',
  kind: 'expense',
  amount: 500_000,
  category: 'alquiler',
  description: null,
  day_of_month: 1,
  start_month: '2026-01',
  end_month: null,
  owner_user_id: null,
  space_id: 'casa',
  payment_method_id: null,
  payer_slot: 1,
  split_mode: 'even',
  share_slot_1: 250_000,
  share_slot_2: 250_000,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  created_by_slot: 1,
  updated_by_slot: 1,
  stopped_by_departure_on: null,
  departure_resolution: null,
  past_terms: [],
};

const row = {
  slot: 2,
  left_at: '2026-10-14T15:00:00+00:00',
  snapshot: {
    space: { id: 'casa', name: 'Casa', initial_balance: 0, created_at: '2026-01-01T00:00:00+00:00' },
    members: [
      { space_id: 'casa', slot: 1, display_name: 'Renzo', status: 'active', is_creator: true },
      { space_id: 'casa', slot: 2, display_name: 'Martina', status: 'active', is_creator: false },
    ],
    expenses: [expense],
    recurrences: [recurrence],
    overrides: [],
    payments: [],
    payment_details: [],
  },
};

describe('la foto de un espacio del que saliste', () => {
  const membership = toFormerMembership(row);

  it('es una membresía con su lugar y la fecha de salida', () => {
    expect(membership.mySlot).toBe(2);
    expect(membership.leftOn).toBe('2026-10-14');
    expect(membership.facts.space.name).toBe('Casa');
  });

  it('Caso 14 · su parte de las cuotas sigue en Futuro; el fijo compartido se corta', () => {
    const { occurrences } = expandPersonalOccurrences(personalFacts({ spaces: [membership] }), {
      from: '2026-11',
      to: '2026-12',
    });
    const inRange = occurrences.filter((item) => item.month >= '2026-11' && item.month <= '2026-12');
    const heladera = inRange.filter((item) => item.label === 'Heladera');
    expect(heladera.map((item) => item.myShare)).toEqual([50_000, 50_000]);
    expect(heladera.every((item) => item.fromFormerMembership)).toBe(true);
    expect(inRange.some((item) => item.label === 'alquiler')).toBe(false);
  });

  it('SA-05 · el pasado no cambia: el alquiler de octubre sigue contando', () => {
    const { occurrences } = expandPersonalOccurrences(personalFacts({ spaces: [membership] }), {
      from: '2026-10',
      to: '2026-10',
    });
    expect(occurrences.some((item) => item.label === 'alquiler')).toBe(true);
  });

  it('P6 · el saldo al salir sale de la foto, calculado por el dominio', () => {
    const balance = calculateSharedBalance(membership.facts, 2, membership.leftOn!);
    // Enero a octubre de alquiler (10 × $250.000) y la 1ª cuota de la
    // heladera ($50.000): su parte de lo que pagó Renzo.
    expect(balance.amount).toBe(-(10 * 250_000 + 50_000));
  });

  it('una foto rota falla, no se ignora', () => {
    expect(() => toFormerMembership({ ...row, snapshot: { space: null } })).toThrow();
    expect(() => toFormerMembership({ ...row, snapshot: { ...row.snapshot, expenses: 'x' } })).toThrow();
  });
});
