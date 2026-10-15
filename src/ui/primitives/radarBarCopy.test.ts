import { describe, it, expect } from 'vitest';
import { radarBarValueText } from './radarBarCopy';

/**
 * UX-03 · el valor accesible de la barra del radar: las cifras en palabras,
 * sin porcentajes (P3) y sin leer Sin asignar como plata disponible (D1).
 */
describe('UX-03 · radarBarValueText', () => {
  it('dice Gastado, Comprometido y los ingresos registrados', () => {
    expect(
      radarBarValueText({ registeredIncome: 1_200_000, spent: 250_000, committed: 550_000 }),
    ).toBe('Gastado $250.000, Comprometido $550.000, de $1.200.000 registrados');
  });

  it('con cero gastado y comprometido sigue diciendo las cifras', () => {
    expect(radarBarValueText({ registeredIncome: 800_000, spent: 0, committed: 0 })).toBe(
      'Gastado $0, Comprometido $0, de $800.000 registrados',
    );
  });

  it('N-08 · con exceso lo dice sin alarma y sin signo negativo', () => {
    expect(
      radarBarValueText({ registeredIncome: 500_000, spent: 535_000, committed: 0 }),
    ).toBe('Gastado $535.000, Comprometido $0, por encima de los $500.000 registrados');
  });

  it('CA-03 · sin ingresos registrados no hay proporciones', () => {
    expect(radarBarValueText({ registeredIncome: 0, spent: 250_000, committed: 100_000 })).toBe(
      'Sin ingresos registrados: todavía no se calcula',
    );
  });

  it('nunca habla de porcentajes', () => {
    const text = radarBarValueText({ registeredIncome: 1_000_000, spent: 1, committed: 1 });
    expect(text).not.toMatch(/%|por ciento/i);
  });
});
