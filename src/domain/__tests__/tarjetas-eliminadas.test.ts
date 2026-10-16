/**
 * P24 · eliminar una tarjeta la OCULTA, no la borra. Desaparece de las listas y
 * de los selectores, pero el historial se sigue calculando con ella: si no, sus
 * compras en 1 pago pasarían de Comprometido (mes del vencimiento) a Gastado
 * (mes de la compra) y se reescribirían meses que ya pasaron.
 */

import { describe, it, expect } from 'vitest';
import { activePaymentMethods, paymentMethodName } from '../cards';
import { expandPersonalOccurrences } from '../occurrences';
import { radarForMonth } from '../radar';
import { calculateUpcomingPayments } from '../upcoming';
import { debito, movement, personalFacts, visa } from './fixtures';

const visaEliminada = { ...visa, deleted: true };

describe('activePaymentMethods', () => {
  it('saca las eliminadas y deja las demás en su orden', () => {
    expect(activePaymentMethods([visaEliminada, debito]).map((m) => m.id)).toEqual(['debito']);
  });

  it('una tarjeta sin la marca (el remoto sin migrar) está activa', () => {
    expect(activePaymentMethods([visa, debito])).toHaveLength(2);
  });

  it('conserva la eliminada que se pide expresamente: la edición de algo que ya la tenía', () => {
    expect(activePaymentMethods([visaEliminada, debito], visa.id).map((m) => m.id)).toEqual([
      'visa',
      'debito',
    ]);
  });
});

describe('paymentMethodName', () => {
  it('una tarjeta activa se llama como es', () => {
    expect(paymentMethodName(visa)).toBe('Visa Galicia');
  });

  it('una eliminada lo dice', () => {
    expect(paymentMethodName(visaEliminada)).toBe('Visa Galicia (eliminada)');
  });
});

describe('eliminar una tarjeta no reescribe el pasado', () => {
  const compras = [
    movement({ amount: 90_000, date: '2026-08-10', paymentMethodId: visa.id }),
    movement({ amount: 40_000, date: '2026-09-02', paymentMethodId: visa.id }),
    movement({ amount: 15_000, date: '2026-09-15', paymentMethodId: debito.id }),
  ];

  it('los totales de un mes pasado son idénticos con la tarjeta eliminada', () => {
    const antes = personalFacts({ paymentMethods: [visa, debito], movements: compras });
    const despues = personalFacts({ paymentMethods: [visaEliminada, debito], movements: compras });

    for (const month of ['2026-08', '2026-09', '2026-10'] as const) {
      expect(radarForMonth(despues, month)).toEqual(radarForMonth(antes, month));
    }
    // Y la compra con tarjeta sigue comprometida en el mes del vencimiento.
    expect(radarForMonth(despues, '2026-09').committed).toBe(90_000);
  });

  it('el resumen estimado sigue armándose con ella y lleva "(eliminada)" en el nombre', () => {
    const facts = personalFacts({ paymentMethods: [visaEliminada, debito], movements: compras });
    const expansion = expandPersonalOccurrences(facts, { from: '2026-08', to: '2026-10' });
    const statements = calculateUpcomingPayments(expansion, '2026-08-20', facts.paymentMethods)
      .filter((payment) => payment.kind === 'card-statement');

    expect(statements.length).toBeGreaterThan(0);
    expect(statements.every((payment) => payment.label === 'Visa Galicia (eliminada)')).toBe(true);
  });
});
