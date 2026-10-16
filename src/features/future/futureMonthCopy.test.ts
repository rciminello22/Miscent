import { describe, it, expect } from 'vitest';
import { breakdownRows, futureUnassignedCopy, FUTURE_COPY } from './futureMonthCopy';

/**
 * §23.1 · "Desglose (al tocar): Fijos · Cuotas · Tarjetas (resumen estimado de
 * cada una) · De tus espacios (tu parte)". Lente "tu parte" (§7.3).
 */
describe('§23.1 · breakdownRows', () => {
  const names = new Map([
    ['visa', 'Visa Galicia'],
    ['master', 'Mastercard'],
  ]);

  it('Fijos, Cuotas, cada tarjeta con su resumen estimado y lo de tus espacios, en ese orden', () => {
    const rows = breakdownRows(
      {
        fixed: 300_000,
        installments: 80_000,
        cards: [
          { cardId: 'master', amount: 60_000 },
          { cardId: 'visa', amount: 120_000 },
        ],
        fromSpaces: 90_000,
      },
      names,
    );

    expect(rows).toEqual([
      { key: 'fixed', label: 'Fijos', amount: 300_000, note: null },
      { key: 'installments', label: 'Cuotas', amount: 80_000, note: null },
      { key: 'card:visa', label: 'Visa Galicia', amount: 120_000, note: 'resumen estimado' },
      { key: 'card:master', label: 'Mastercard', amount: 60_000, note: 'resumen estimado' },
      { key: 'spaces', label: 'De tus espacios', amount: 90_000, note: 'tu parte' },
    ]);
  });

  it('lo que está en cero no aparece', () => {
    const rows = breakdownRows({ fixed: 0, installments: 50_000, cards: [], fromSpaces: 0 }, names);

    expect(rows.map((row) => row.key)).toEqual(['installments']);
  });

  it('una tarjeta que ya no está se llama "Tarjeta", nunca por su id', () => {
    const rows = breakdownRows(
      { fixed: 0, installments: 0, cards: [{ cardId: 'uuid-borrada', amount: 10_000 }], fromSpaces: 0 },
      names,
    );

    expect(rows[0]!.label).toBe('Tarjeta');
  });

  it('sin nada, sin filas', () => {
    expect(breakdownRows({ fixed: 0, installments: 0, cards: [], fromSpaces: 0 }, names)).toEqual([]);
  });
});

/**
 * UX-10 · §23.1 · §33 · N-08 · el "Sin asignar" de un mes futuro.
 *
 * Es la cifra con más riesgo de leerse como plata disponible: sin su ayuda
 * ("según tus ingresos previstos") y, en negativo, con un "−$X" crudo.
 */
describe('UX-10 · futureUnassignedCopy', () => {
  it('§33 · con Sin asignar positivo, la cifra lleva su ayuda', () => {
    expect(futureUnassignedCopy(580_000)).toEqual({
      kind: 'unassigned',
      label: 'Sin asignar',
      help: 'todavía sin destino, según tus ingresos previstos',
      amount: 580_000,
    });
  });

  it('con Sin asignar en cero sigue siendo una cifra con su ayuda (no es exceso)', () => {
    expect(futureUnassignedCopy(0).kind).toBe('unassigned');
  });

  it('N-08 · con negativo NO hay cifra con signo: es la frase con el exceso en positivo', () => {
    expect(futureUnassignedCopy(-35_000)).toEqual({
      kind: 'exceeds',
      text: 'Tus gastos y compromisos superan tus ingresos previstos por',
      amount: 35_000,
    });
  });

  it('§23.1 · sin ingreso previsto no se calcula: "Sin ingreso registrado"', () => {
    expect(futureUnassignedCopy(null)).toEqual({
      kind: 'noIncome',
      text: 'Sin ingreso registrado',
    });
  });

  it('la ayuda nunca usa los términos prohibidos (CA-00)', () => {
    const texts = [FUTURE_COPY.unassigned.help, FUTURE_COPY.exceeds, FUTURE_COPY.noIncome];
    for (const text of texts) {
      expect(text).not.toMatch(/disponible|te queda|libre|podés gastar|por día/i);
    }
  });
});
