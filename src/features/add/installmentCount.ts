/**
 * UX-06 · §17 campo 8 · la cantidad de cuotas "Otra". TS puro.
 *
 * Los chips cubren 3, 6, 9, 12 y 18. "Otra" abre un campo numérico para el
 * resto (2, 4, 10, 24...). El rango es de 2 a 36: con 1 no hay cuotas (§17,
 * "Cuotas menores a 2") y más de 36 no es una compra real.
 */

export const INSTALLMENT_MIN = 2;
export const INSTALLMENT_MAX = 36;

export type InstallmentCountIssue = 'too-few' | 'too-many';

/** Lo que se tipeó, como número. Solo dígitos y a lo sumo dos; vacío es null. */
export function parseInstallmentCount(text: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, 2);
  return digits === '' ? null : Number(digits);
}

/** Qué le pasa a una cantidad ya elegida. Sin cantidad no hay problema. */
export function installmentCountIssue(count: number | null): InstallmentCountIssue | null {
  if (count == null) return null;
  if (count < INSTALLMENT_MIN) return 'too-few';
  if (count > INSTALLMENT_MAX) return 'too-many';
  return null;
}

/** Hay cuotas y la cantidad sirve. */
export function isValidInstallmentCount(count: number | null): count is number {
  return count != null && installmentCountIssue(count) == null;
}

/**
 * Al EDITAR, qué cantidad se valida. El rango de §17 es para una compra nueva;
 * un plan guardado puede tener 1 cuota (Q-06 "5 de 6", Q-07 "Terminar
 * ahora", H-06). Si la cantidad no cambió, no se vuelve a validar: si no,
 * esa compra no se podía editar en nada (ni la descripción).
 */
export function countToValidateOnEdit(current: number | null, saved: number | null): number | null {
  return current === saved ? null : current;
}

export function installmentCountMessage(issue: InstallmentCountIssue): string {
  return issue === 'too-few'
    ? 'Para una sola cuota, desactivá En cuotas.'
    : `Hasta ${INSTALLMENT_MAX} cuotas.`;
}
