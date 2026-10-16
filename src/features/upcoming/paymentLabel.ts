import type { UpcomingPayment } from '@domain/upcoming';

/** El rótulo corto de N-10, en cada fila de un resumen estimado. */
export const ESTIMATED_STATEMENT_LABEL = 'resumen estimado';

/** El título de un pago: un resumen de tarjeta lleva su rótulo corto. TS puro. */
export function paymentLabel(payment: Pick<UpcomingPayment, 'label' | 'isEstimate'>): string {
  if (!payment.isEstimate || /resumen/i.test(payment.label)) return payment.label;
  return `${payment.label} · ${ESTIMATED_STATEMENT_LABEL}`;
}
