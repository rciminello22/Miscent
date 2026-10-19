import { describe, it, expect } from 'vitest';
import { isMissingFunction, removeFormerSpaceFailure } from './removeFormerSpace';

/**
 * La app tiene que tolerar que la función todavía no exista en la base
 * (HANDOFF §6): antes de aplicar la 0021, quitar un espacio falla con
 * PGRST202 (PostgREST no la encuentra) y la pantalla lo dice sin romperse.
 */

describe('isMissingFunction', () => {
  it('PGRST202: PostgREST no encuentra la función en su caché de esquema', () => {
    expect(isMissingFunction({ code: 'PGRST202' })).toBe(true);
  });

  it('42883: Postgres undefined_function', () => {
    expect(isMissingFunction({ code: '42883' })).toBe(true);
  });

  it('otros errores y la ausencia de error no son "falta la función"', () => {
    expect(isMissingFunction({ code: '42501' })).toBe(false);
    expect(isMissingFunction({})).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
  });
});

describe('removeFormerSpaceFailure', () => {
  it('con la función sin aplicar, dice que todavía no se puede', () => {
    const failure = removeFormerSpaceFailure({ code: 'PGRST202', message: 'Could not find the function' });

    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe('Todavía no se puede hacer. Probá de nuevo más tarde.');
  });

  it('cualquier otro error pide probar de nuevo, sin filtrar el mensaje técnico', () => {
    const failure = removeFormerSpaceFailure({ code: '08006', message: 'connection failure' });

    expect(failure.message).toBe('Probá de nuevo en un momento.');
  });
});
