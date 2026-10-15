import { describe, it, expect } from 'vitest';
import { COMMON_DAYS, otherDays } from './dayOptions';

/**
 * UX-22 · el selector de día: los atajos van aparte y el resto en orden.
 * Antes la lista corrida iba 1, 5, 10 ... 31, 2, 3, 4 ..., y parecía rota.
 */
describe('dayOptions', () => {
  it('los atajos son los días de cobro y de cierre de siempre, ascendentes', () => {
    expect(COMMON_DAYS).toEqual([1, 5, 10, 15, 20, 25, 28, 30, 31]);
  });

  it('el resto va en orden ascendente y sin repetir los atajos', () => {
    const rest = otherDays();
    expect(rest).toEqual([...rest].sort((a, b) => a - b));
    expect(rest.some((day) => COMMON_DAYS.includes(day))).toBe(false);
    expect(rest[0]).toBe(2);
    expect(rest).toHaveLength(22);
  });

  it('juntos cubren los 31 días', () => {
    const all = [...COMMON_DAYS, ...otherDays()].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
  });
});
