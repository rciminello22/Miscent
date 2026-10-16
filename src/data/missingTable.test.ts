import { describe, it, expect } from 'vitest';
import { isMissingTable } from './missingTable';

describe('isMissingTable', () => {
  it('la tabla que PostgREST no conoce', () => {
    expect(isMissingTable({ code: 'PGRST205' })).toBe(true);
  });

  it('la tabla que Postgres no tiene', () => {
    expect(isMissingTable({ code: '42P01' })).toBe(true);
  });

  it('cualquier otro error NO es una tabla que falta: se sigue tirando', () => {
    expect(isMissingTable({ code: '42501' })).toBe(false);
    expect(isMissingTable({ code: undefined })).toBe(false);
    expect(isMissingTable({})).toBe(false);
  });

  it('sin error no falta nada', () => {
    expect(isMissingTable(null)).toBe(false);
  });
});
