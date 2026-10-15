/**
 * UX-22 · los días del selector. Un sueldo se cobra el 1, el 5 o a fin de mes;
 * una tarjeta cierra el 20 o el 25. Esos van como atajos, separados del resto,
 * que sigue en orden ascendente.
 */
export const COMMON_DAYS: number[] = [1, 5, 10, 15, 20, 25, 28, 30, 31];

export function otherDays(): number[] {
  return Array.from({ length: 31 }, (_, index) => index + 1).filter(
    (day) => !COMMON_DAYS.includes(day),
  );
}
