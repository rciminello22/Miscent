import { describe, it, expect } from 'vitest';
import type { UpcomingPayment } from '@domain/upcoming';
import {
  futurePaymentsView,
  initialPaymentsMonth,
  paymentsTitle,
  CURRENT_MONTH_PARAM,
} from './paymentsMonth';

/**
 * UX-07 · UX-24 · §23.2 · el mes de la lista de Próximos pagos de Futuro.
 *
 * "Ver todos" en Inicio promete la lista completa, pero Futuro arrancaba en el
 * mes que viene: los pagos de este mes después del tercero no se veían en
 * ningún lado. Las barras de 6 meses (§23.1) no cambian; solo la LISTA de
 * pagos puede elegir también el mes en curso.
 */

const TODAY = '2026-10-14';

function payment(overrides: Partial<UpcomingPayment> & Pick<UpcomingPayment, 'id'>): UpcomingPayment {
  return {
    kind: 'fixed',
    label: overrides.id,
    cardId: null,
    amount: 10_000,
    includesOtherShare: 0,
    otherMemberName: null,
    date: '2026-10-20',
    month: '2026-10',
    approximate: false,
    hasPassed: false,
    items: [],
    isEstimate: false,
    ...overrides,
  };
}

describe('UX-07 · initialPaymentsMonth', () => {
  it('sin parámetro arranca en el mes que viene (§23.1)', () => {
    expect(initialPaymentsMonth(undefined, TODAY)).toBe('2026-11');
  });

  it('"Ver todos" de Inicio abre el mes en curso', () => {
    expect(initialPaymentsMonth(CURRENT_MONTH_PARAM, TODAY)).toBe('2026-10');
  });

  it('un parámetro inválido o fuera del rango cae en el mes que viene', () => {
    expect(initialPaymentsMonth('basura', TODAY)).toBe('2026-11');
    expect(initialPaymentsMonth('2025-01', TODAY)).toBe('2026-11');
    expect(initialPaymentsMonth('2030-01', TODAY)).toBe('2026-11');
  });

  it('el cambio de año no rompe el mes que viene', () => {
    expect(initialPaymentsMonth(undefined, '2026-12-20')).toBe('2027-01');
  });
});

describe('UX-24 · paymentsTitle', () => {
  it('titula con el mes, en es-AR', () => {
    expect(paymentsTitle('2026-10', TODAY)).toBe('Pagos de octubre');
    expect(paymentsTitle('2026-11', TODAY)).toBe('Pagos de noviembre');
  });

  it('un mes de otro año lo aclara', () => {
    expect(paymentsTitle('2027-01', TODAY)).toBe('Pagos de enero de 2027');
  });
});

describe('UX-07 · futurePaymentsView', () => {
  const payments = [
    payment({ id: 'ya-paso', date: '2026-10-05', hasPassed: true }),
    payment({ id: 'hoy', date: '2026-10-14' }),
    payment({ id: 'octubre-tarde', date: '2026-10-28' }),
    payment({ id: 'octubre-sin-dia', date: null, month: '2026-10', approximate: true }),
    payment({ id: 'noviembre', date: '2026-11-05', month: '2026-11' }),
  ];

  it('el mes en curso lista solo lo que falta desde hoy (como upcomingFrom)', () => {
    const view = futurePaymentsView({ payments, today: TODAY, selectedMonth: '2026-10' });

    expect(view.payments.map((p) => p.id)).toEqual(['hoy', 'octubre-tarde', 'octubre-sin-dia']);
    expect(view.isCurrentMonth).toBe(true);
    expect(view.title).toBe('Pagos de octubre');
  });

  it('un mes futuro lista todos sus pagos', () => {
    const view = futurePaymentsView({ payments, today: TODAY, selectedMonth: '2026-11' });

    expect(view.payments.map((p) => p.id)).toEqual(['noviembre']);
    expect(view.isCurrentMonth).toBe(false);
  });

  it('con el mes en curso elegido NO se muestra el desglose del mes futuro', () => {
    expect(
      futurePaymentsView({ payments, today: TODAY, selectedMonth: '2026-10' }).showMonthDetail,
    ).toBe(false);
    expect(
      futurePaymentsView({ payments, today: TODAY, selectedMonth: '2026-11' }).showMonthDetail,
    ).toBe(true);
  });

  it('el mes en curso sin pagos por venir igual muestra el bloque, vacío', () => {
    const view = futurePaymentsView({
      payments: [payment({ id: 'noviembre', date: '2026-11-05', month: '2026-11' })],
      today: TODAY,
      selectedMonth: '2026-10',
    });

    expect(view.payments).toEqual([]);
    expect(view.showBlock).toBe(true);
  });

  it('un mes futuro sin pagos oculta el bloque', () => {
    const view = futurePaymentsView({ payments: [], today: TODAY, selectedMonth: '2026-12' });
    expect(view.showBlock).toBe(false);
  });
});
