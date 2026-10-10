import { describe, it, expect } from 'vitest';
import { lastUsedPaymentMethodId, moreOptionsSummary } from './addDefaults';

/**
 * §17 campo 7 · "Medio de pago: Último usado". Con el formulario más liviano
 * (10/10), el medio queda a la vista y arranca en el último: un gasto
 * cotidiano vuelve a ser "monto + categoría + guardar" (principio 4).
 */
describe('lastUsedPaymentMethodId', () => {
  const methods = [{ id: 'visa' }, { id: 'debito' }];

  it('el del gasto más reciente', () => {
    const movements = [
      { kind: 'expense', date: '2026-10-01', paymentMethodId: 'debito' },
      { kind: 'expense', date: '2026-10-08', paymentMethodId: 'visa' },
    ] as const;
    expect(lastUsedPaymentMethodId(movements, methods)).toBe('visa');
  });

  it('ignora ingresos y gastos sin medio', () => {
    const movements = [
      { kind: 'expense', date: '2026-10-01', paymentMethodId: 'debito' },
      { kind: 'income', date: '2026-10-05', paymentMethodId: 'visa' },
      { kind: 'expense', date: '2026-10-09', paymentMethodId: null },
    ] as const;
    expect(lastUsedPaymentMethodId(movements, methods)).toBe('debito');
  });

  it('un medio que ya no existe (archivado) no se propone', () => {
    const movements = [{ kind: 'expense', date: '2026-10-09', paymentMethodId: 'naranja' }] as const;
    expect(lastUsedPaymentMethodId(movements, methods)).toBeNull();
  });

  it('sin historia, ninguno', () => {
    expect(lastUsedPaymentMethodId([], methods)).toBeNull();
  });
});

/**
 * Lo que está detrás de "Más opciones" se dice en la fila colapsada: nada
 * queda escondido sin que se sepa.
 */
describe('moreOptionsSummary', () => {
  const TODAY = '2026-10-10';
  const base = { date: TODAY, today: TODAY, installmentCount: null, repeats: false, description: '' };

  it('todo por defecto', () => {
    expect(moreOptionsSummary(base)).toBe('Hoy · en 1 pago');
  });

  it('ayer, en cuotas', () => {
    expect(moreOptionsSummary({ ...base, date: '2026-10-09', installmentCount: 6 })).toBe(
      'Ayer · 6 cuotas',
    );
  });

  it('otra fecha, que se repite, con descripción', () => {
    expect(
      moreOptionsSummary({ ...base, date: '2026-10-03', repeats: true, description: 'Netflix' }),
    ).toBe('3 oct · se repite cada mes · "Netflix"');
  });
});
