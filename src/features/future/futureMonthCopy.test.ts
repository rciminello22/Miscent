import { describe, it, expect } from 'vitest';
import { futureUnassignedCopy, FUTURE_COPY } from './futureMonthCopy';

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
