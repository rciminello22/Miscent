/**
 * UX-22 · §22: la app NO modela la deuda bancaria, solo lo que se paga en cada
 * resumen. Por eso nunca "¿Qué debés…?".
 */
export function cardStepTitle(cardName: string): string {
  return `¿Qué tenés para pagar de tu ${cardName}?`;
}
