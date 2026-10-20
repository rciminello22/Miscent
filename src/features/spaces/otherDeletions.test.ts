import { describe, it, expect } from 'vitest';
import type { ActivityEvent } from '@domain/activity';
import { deletionNoticeText, recentDeletionsByOther } from './otherDeletions';

/**
 * P27 · lo que eliminó el otro se ve en el espacio, sin tener que buscarlo. No
 * hay aprobación (K3 / X-02): es un aviso, y dura 7 días. No guarda "visto" por
 * persona (haría falta base): la ventana de tiempo es la regla.
 */

const TODAY = '2026-10-20';
const MI_SLOT = 1 as const;
const ctx = { mySlot: MI_SLOT, otherName: 'Martina', categoryLabel: (c: string) => c.charAt(0).toUpperCase() + c.slice(1) };

/** Un instante a mediodía del día local dado: la fecha del teléfono no se corre de día. */
const at = (day: string) => new Date(`${day}T12:00:00`).toISOString();

const event = (overrides: Partial<ActivityEvent>): ActivityEvent => ({
  key: 'k',
  at: at('2026-10-19'),
  bySlot: 2,
  verb: 'deleted',
  kind: 'expense',
  amount: 100_000,
  category: 'supermercado',
  description: 'Supermercado',
  date: '2026-10-10',
  fromSlot: null,
  ...overrides,
});

describe('recentDeletionsByOther · qué eliminó el otro esta semana', () => {
  it('solo las eliminaciones: crear o editar no es un aviso', () => {
    const events = [
      event({ key: 'a', verb: 'created' }),
      event({ key: 'b', verb: 'edited' }),
      event({ key: 'c', verb: 'deleted' }),
    ];

    expect(recentDeletionsByOther(events, MI_SLOT, TODAY).map((item) => item.key)).toEqual(['c']);
  });

  it('solo las del otro: lo que eliminaste vos no se te avisa', () => {
    const events = [event({ key: 'mia', bySlot: 1 }), event({ key: 'suya', bySlot: 2 })];

    expect(recentDeletionsByOther(events, MI_SLOT, TODAY).map((item) => item.key)).toEqual(['suya']);
  });

  it('dentro de los 7 días: hoy y el mismo día de hace una semana entran, el anterior no', () => {
    const events = [
      event({ key: 'hoy', at: at('2026-10-20') }),
      event({ key: 'limite', at: at('2026-10-13') }),
      event({ key: 'viejo', at: at('2026-10-12') }),
    ];

    expect(recentDeletionsByOther(events, MI_SLOT, TODAY).map((item) => item.key)).toEqual(['hoy', 'limite']);
  });

  it('la más reciente primero, aunque lleguen desordenadas', () => {
    const events = [
      event({ key: 'vieja', at: at('2026-10-15') }),
      event({ key: 'nueva', at: at('2026-10-19') }),
      event({ key: 'media', at: at('2026-10-17') }),
    ];

    expect(recentDeletionsByOther(events, MI_SLOT, TODAY).map((item) => item.key)).toEqual([
      'nueva',
      'media',
      'vieja',
    ]);
  });

  it('sin nada que avisar, la lista vacía', () => {
    expect(recentDeletionsByOther([], MI_SLOT, TODAY)).toEqual([]);
  });

  it('también cuenta el pago eliminado', () => {
    const events = [event({ key: 'p', kind: 'payment', fromSlot: 2, description: null, category: null })];

    expect(recentDeletionsByOther(events, MI_SLOT, TODAY)).toHaveLength(1);
  });

  it('vale para quien ocupa el slot 2 también: el "otro" es el otro slot', () => {
    const events = [event({ key: 'del1', bySlot: 1 }), event({ key: 'del2', bySlot: 2 })];

    expect(recentDeletionsByOther(events, 2, TODAY).map((item) => item.key)).toEqual(['del1']);
  });
});

describe('deletionNoticeText · la frase del aviso', () => {
  it('sin eliminaciones del otro no hay aviso', () => {
    expect(deletionNoticeText([event({ bySlot: 1 })], ctx, TODAY)).toBeNull();
    expect(deletionNoticeText([], ctx, TODAY)).toBeNull();
  });

  it('la última, con quién, qué, cuánto y cuándo', () => {
    expect(deletionNoticeText([event({ at: at('2026-10-19') })], ctx, TODAY)).toBe(
      'Martina eliminó Supermercado · $100.000 · ayer',
    );
    expect(deletionNoticeText([event({ at: at('2026-10-20') })], ctx, TODAY)).toBe(
      'Martina eliminó Supermercado · $100.000 · hoy',
    );
    expect(deletionNoticeText([event({ at: at('2026-10-15') })], ctx, TODAY)).toBe(
      'Martina eliminó Supermercado · $100.000 · 15 oct',
    );
  });

  it('con varias, nombra la última y cuenta las demás', () => {
    const events = [
      event({ key: 'a', at: at('2026-10-17'), description: 'Luz', amount: 30_000 }),
      event({ key: 'b', at: at('2026-10-19'), description: 'Super', amount: 100_000 }),
      event({ key: 'c', at: at('2026-10-18'), description: 'Gas', amount: 20_000 }),
    ];

    expect(deletionNoticeText(events, ctx, TODAY)).toBe('Martina eliminó Super · $100.000 · ayer (y 2 más)');
  });

  it('con una sola no hay "y N más"', () => {
    expect(deletionNoticeText([event({})], ctx, TODAY)).not.toContain('más');
  });
});
