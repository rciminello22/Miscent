import { describe, it, expect } from 'vitest';
import type { ActivityEvent } from '@domain/activity';
import { activityLine, activityWhen } from './activityCopy';

const label = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);
const ctx = { mySlot: 1 as const, otherName: 'Martina', categoryLabel: label };

const event = (overrides: Partial<ActivityEvent>): ActivityEvent => ({
  key: 'k',
  at: '2026-10-14T12:00:00+00:00',
  bySlot: 2,
  verb: 'created',
  kind: 'expense',
  amount: 100_000,
  category: 'supermercado',
  description: null,
  date: '2026-10-14',
  fromSlot: null,
  ...overrides,
});

describe('Should 6 · las líneas de la actividad', () => {
  it('quién hizo qué, en segunda persona para uno mismo', () => {
    expect(activityLine(event({}), ctx)).toBe('Martina cargó Supermercado · $100.000');
    expect(activityLine(event({ bySlot: 1, verb: 'edited' }), ctx)).toBe('Editaste Supermercado · $100.000');
    expect(activityLine(event({ verb: 'deleted', description: 'Super' }), ctx)).toBe('Martina eliminó Super · $100.000');
  });

  it('un fijo se dice fijo', () => {
    expect(activityLine(event({ kind: 'recurrence', category: 'alquiler', amount: 500_000 }), ctx)).toBe(
      'Martina cargó el fijo Alquiler · $500.000',
    );
  });

  it('un pago, con quién le pagó a quién', () => {
    expect(activityLine(event({ kind: 'payment', fromSlot: 2, amount: 20_000 }), ctx)).toBe(
      'Martina registró que te pagó $20.000',
    );
    expect(activityLine(event({ kind: 'payment', bySlot: 1, fromSlot: 1, amount: 20_000 }), ctx)).toBe(
      'Registraste que le pagaste $20.000 a Martina',
    );
    expect(activityLine(event({ kind: 'payment', verb: 'deleted', fromSlot: 2, amount: 20_000 }), ctx)).toBe(
      'Martina eliminó el pago de $20.000',
    );
  });

  it('cuándo: hoy, ayer o la fecha', () => {
    const local = (iso: string) => new Date(iso).toISOString();
    expect(activityWhen(local('2026-10-14T15:00:00'), '2026-10-14')).toBe('hoy');
    expect(activityWhen(local('2026-10-13T15:00:00'), '2026-10-14')).toBe('ayer');
    expect(activityWhen(local('2026-10-05T15:00:00'), '2026-10-14')).toBe('5 oct');
  });
});
