import { describe, it, expect } from 'vitest';
import { paymentLabel } from './paymentLabel';

/**
 * N-10 · todo resumen estimado se rotula, y el rótulo corto va en CADA fila
 * ("Visa Galicia · resumen estimado", como en el ejemplo de §15). La frase
 * completa, "Estimado según lo que registraste", va una vez por bloque.
 */
describe('paymentLabel', () => {
  it('un resumen de tarjeta lleva "resumen estimado" en su título', () => {
    expect(paymentLabel({ label: 'Visa Galicia', isEstimate: true })).toBe(
      'Visa Galicia · resumen estimado',
    );
  });

  it('un fijo o una cuota se llaman como son', () => {
    expect(paymentLabel({ label: 'Alquiler', isEstimate: false })).toBe('Alquiler');
  });

  it('no lo repite si el nombre ya dice "resumen"', () => {
    expect(paymentLabel({ label: 'Resumen Visa', isEstimate: true })).toBe('Resumen Visa');
  });
});
