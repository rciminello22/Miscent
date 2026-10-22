import { describe, expect, it } from 'vitest';
import { isMissingFunction } from './pendingMigration';

describe('isMissingFunction · la 0022 todavía no está en la base', () => {
  it('reconoce la función que PostgREST no encuentra', () => {
    expect(isMissingFunction({ code: 'PGRST202' })).toBe(true);
    expect(isMissingFunction({ code: '42883' })).toBe(true);
  });

  it('cualquier otro error NO es "falta la migración": se sigue tirando', () => {
    expect(isMissingFunction(null)).toBe(false);
    expect(isMissingFunction({ code: '42501' })).toBe(false); // RLS
    expect(isMissingFunction({ code: '23514' })).toBe(false); // CHECK
    expect(isMissingFunction({})).toBe(false); // red caída
  });
});
