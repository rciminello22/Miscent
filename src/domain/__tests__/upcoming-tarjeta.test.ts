import { describe, it, expect } from 'vitest';
import { expandPersonalOccurrences } from '../occurrences';
import type { PaymentMethod } from '../types';
import { calculateUpcomingPayments } from '../upcoming';
import { debito, mastercard, movement, personalFacts, visa } from './fixtures';

/**
 * §23.2 · el resumen estimado de una tarjeta se rotula con el NOMBRE de la
 * tarjeta, no con su id. El dominio recibe los medios de pago (ya están en los
 * hechos) y deja el id en un campo propio para quien necesite abrir el detalle.
 */

const HOY = '2026-10-20';

function pagos(methods: readonly PaymentMethod[] = [visa, mastercard, debito]) {
  const facts = personalFacts({
    paymentMethods: [visa, mastercard, debito],
    movements: [
      movement({ amount: 40_000, date: '2026-10-07', paymentMethodId: visa.id }),
      movement({ amount: 10_000, date: '2026-10-08', paymentMethodId: mastercard.id }),
    ],
  });
  const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
  return calculateUpcomingPayments(expansion, HOY, methods);
}

describe('§23.2 · rótulo del resumen estimado', () => {
  it('el label es el nombre de la tarjeta, no su id', () => {
    const resumenes = pagos().filter((pago) => pago.kind === 'card-statement');

    expect(resumenes.map((pago) => pago.label).sort()).toEqual(['Mastercard', 'Visa Galicia']);
  });

  it('el id de la tarjeta queda en su propio campo', () => {
    const resumen = pagos().find((pago) => pago.label === 'Visa Galicia')!;

    expect(resumen.cardId).toBe(visa.id);
  });

  it('si la tarjeta no está entre los medios de pago no inventa un nombre ni muestra el id', () => {
    const resumen = pagos([]).find((pago) => pago.kind === 'card-statement')!;

    expect(resumen.label).toBe('Tarjeta');
    expect(resumen.label).not.toBe(resumen.cardId);
  });

  it('los pagos que no son resumen de tarjeta no llevan cardId', () => {
    const facts = personalFacts({ movements: [] });
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    const otros = calculateUpcomingPayments(expansion, HOY, facts.paymentMethods).filter(
      (pago) => pago.kind !== 'card-statement',
    );

    expect(otros.every((pago) => pago.cardId === null)).toBe(true);
  });
});
