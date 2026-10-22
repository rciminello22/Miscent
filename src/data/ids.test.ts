import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId · el id que genera la app para que un alta sea idempotente', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('es un uuid v4, que es lo que espera la base', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('no se repite', () => {
    const ids = new Set(Array.from({ length: 2_000 }, newId));
    expect(ids.size).toBe(2_000);
  });

  it('sin crypto en el motor (Hermes viejo), sigue siendo un uuid v4 que no se repite', () => {
    vi.stubGlobal('crypto', undefined);
    const ids = Array.from({ length: 500 }, newId);
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(500);
  });
});
