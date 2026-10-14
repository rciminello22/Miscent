import { describe, it, expect } from 'vitest';
import { deletedLabel, deletedTag, markAllLabel, reviewTag, toReviewLine } from './reviewCopy';

describe('Opción B · el texto de "para revisar"', () => {
  it('en cada registro: quién lo cargó (autoría visible, K3)', () => {
    expect(reviewTag('Martina')).toBe('Lo cargó Martina · para revisar');
  });

  it('el resumen, en singular y en plural', () => {
    expect(toReviewLine(1)).toBe('1 cosa para revisar');
    expect(toReviewLine(4)).toBe('4 cosas para revisar');
  });

  it('el botón para marcar todo', () => {
    expect(markAllLabel(1)).toBe('Está bien');
    expect(markAllLabel(4)).toBe('Están bien');
  });
});

describe('Opción B · lo que eliminó el otro', () => {
  const base = {
    sourceId: 'x',
    deletedBySlot: 2 as const,
    deletedAt: '2026-10-12T10:00:00+00:00',
    amount: 100_000,
    occurredOn: '2026-10-05',
    category: 'supermercado' as const,
    description: null,
    fromSlot: null,
    createdBySlot: 1 as const,
    recordCreatedAt: null,
  };

  // categories.ts trae íconos nativos: se inyecta, como el formato en Movimientos.
  const ctx = (mySlot: 1 | 2) => ({
    mySlot,
    otherName: 'Martina',
    categoryLabel: (category: string) => category.charAt(0).toUpperCase() + category.slice(1),
  });

  it('la marca dice quién lo eliminó, sin juzgar', () => {
    expect(deletedTag('Martina')).toBe('Lo eliminó Martina · para revisar');
  });

  it('un gasto: su descripción, o su categoría', () => {
    expect(deletedLabel({ ...base, kind: 'expense', description: 'Super del mes' }, ctx(1))).toBe(
      'Super del mes',
    );
    expect(deletedLabel({ ...base, kind: 'expense' }, ctx(1))).toBe('Supermercado');
  });

  it('un fijo se dice fijo', () => {
    expect(deletedLabel({ ...base, kind: 'recurrence', category: 'alquiler', occurredOn: null }, ctx(1))).toBe(
      'Fijo · Alquiler',
    );
  });

  it('un pago, desde quien lo lee', () => {
    expect(deletedLabel({ ...base, kind: 'payment', category: null, fromSlot: 2 }, ctx(1))).toBe(
      'Martina te pagó',
    );
    expect(deletedLabel({ ...base, kind: 'payment', category: null, fromSlot: 1 }, ctx(1))).toBe(
      'Le pagaste a Martina',
    );
  });
});
