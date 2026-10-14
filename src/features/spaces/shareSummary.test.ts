import { describe, it, expect } from 'vitest';
import { spaceSummaryText } from './shareSummary';

/**
 * Should 3 · compartir el resumen del espacio como texto. Se lee fuera de la
 * app (WhatsApp), así que va en tercera persona y con los nombres: "te debe"
 * lo leería mal quien lo recibe.
 */
describe('el resumen del espacio como texto', () => {
  const base = {
    spaceName: 'Casa',
    monthName: 'octubre',
    myName: 'Renzo',
    otherName: 'Martina',
    balance: { amount: 20_000, settled: false },
    month: { total: 350_000, mine: { put: 250_000, share: 175_000 }, other: { put: 100_000, share: 175_000 } },
    expenses: [
      { date: '2026-10-05', label: 'Supermercado', amount: 100_000, payerName: 'Martina' },
      { date: '2026-10-01', label: 'Alquiler', amount: 250_000, payerName: 'Renzo' },
    ],
    payments: [],
  };

  it('el saldo en tercera persona, sin "te"', () => {
    expect(spaceSummaryText(base)).toContain('Martina le debe $20.000 a Renzo.');
    expect(spaceSummaryText({ ...base, balance: { amount: -5_000, settled: false } })).toContain(
      'Renzo le debe $5.000 a Martina.',
    );
    expect(spaceSummaryText({ ...base, balance: { amount: 0, settled: true } })).toContain('Están a mano.');
  });

  it('el mes: total, lo que puso cada uno y su parte', () => {
    const text = spaceSummaryText(base);
    expect(text).toContain('Gastos compartidos de octubre hasta hoy: $350.000');
    expect(text).toContain('Renzo puso $250.000 (su parte, $175.000)');
    expect(text).toContain('Martina puso $100.000 (su parte, $175.000)');
  });

  it('lo que se cargó, con quién pagó', () => {
    expect(spaceSummaryText(base)).toContain('5 oct · Supermercado · $100.000 · pagó Martina');
  });

  it('empieza por el espacio y el mes', () => {
    expect(spaceSummaryText(base).split('\n')[0]).toBe('Casa · octubre');
  });

  it('con muchos gastos, corta y dice cuántos más', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      date: '2026-10-02',
      label: `Gasto ${index}`,
      amount: 1_000,
      payerName: 'Renzo',
    }));
    expect(spaceSummaryText({ ...base, expenses: many })).toContain('y 5 más');
  });

  it('nunca menciona un medio de pago (C-05): no lo recibe', () => {
    expect(spaceSummaryText(base)).not.toMatch(/visa|tarjeta|débito/i);
  });
});
