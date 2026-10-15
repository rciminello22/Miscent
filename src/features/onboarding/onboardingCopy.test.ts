import { describe, it, expect } from 'vitest';
import { cardStepTitle } from './onboardingCopy';

/**
 * UX-22 · §22: la app NO modela la deuda bancaria. "¿Qué debés de tu Visa?"
 * invitaba a cargar saldos; lo que se pide son los pagos del resumen.
 */
describe('cardStepTitle', () => {
  it('pregunta por lo que hay para pagar, no por lo que se debe', () => {
    expect(cardStepTitle('Visa')).toBe('¿Qué tenés para pagar de tu Visa?');
  });

  it('nunca dice "debés"', () => {
    expect(cardStepTitle('Mastercard Galicia')).not.toMatch(/deb/i);
  });
});
