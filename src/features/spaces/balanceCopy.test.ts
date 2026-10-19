import { describe, it, expect } from 'vitest';
import type { SpaceMonth } from '@domain/shared-balance';
import { formatPesos } from '@/lib/format';
import {
  balanceLines,
  balanceSentence,
  departureBalanceSentence,
  paymentSentence,
  previousMonthSentence,
  putExtraSentence,
} from './balanceCopy';

/** Solo los campos que leen las frases del mes. */
function month(patch: { viewerPutExtra?: number; previousBalance?: number | null }): SpaceMonth {
  return {
    viewerPutExtra: 0,
    previousBalance: null,
    other: { name: 'Martina', put: 0, share: 0 },
    ...patch,
  } as SpaceMonth;
}

/**
 * S-05 y CA-25 · "puso de más" y el puente con el mes anterior son DOS frases
 * separadas: nunca un total, un signo igual ni la diferencia como si fuera la deuda.
 */
describe('putExtraSentence · S-05', () => {
  it('el usuario puso de más', () => {
    expect(putExtraSentence(month({ viewerPutExtra: 70_000 }))).toBe(
      'Este mes pusiste $70.000 de más.',
    );
  });

  it('el otro puso de más', () => {
    expect(putExtraSentence(month({ viewerPutExtra: -70_000 }))).toBe(
      'Este mes Martina puso $70.000 de más.',
    );
  });

  it('puso lo mismo: sin frase', () => {
    expect(putExtraSentence(month({ viewerPutExtra: 0 }))).toBeNull();
  });

  it('en un mes que ya pasó dice el mes y no "este mes"', () => {
    expect(putExtraSentence(month({ viewerPutExtra: 70_000 }), 'En septiembre')).toBe(
      'En septiembre pusiste $70.000 de más.',
    );
    expect(putExtraSentence(month({ viewerPutExtra: -70_000 }), 'En septiembre')).toBe(
      'En septiembre Martina puso $70.000 de más.',
    );
  });
});

describe('previousMonthSentence · el puente con el mes anterior', () => {
  it('venían de septiembre', () => {
    expect(previousMonthSentence(month({ previousBalance: -50_000 }), 'septiembre')).toBe(
      'Venían de septiembre: Martina había puesto $50.000 de más.',
    );
    expect(previousMonthSentence(month({ previousBalance: 50_000 }), 'septiembre')).toBe(
      'Venían de septiembre: Martina había puesto $50.000 de menos.',
    );
  });

  it('sin mes anterior o en cero, sin frase', () => {
    expect(previousMonthSentence(month({ previousBalance: null }), 'septiembre')).toBeNull();
    expect(previousMonthSentence(month({ previousBalance: 0 }), 'septiembre')).toBeNull();
  });

  it('nunca lleva signo igual ni un total', () => {
    const text = previousMonthSentence(month({ previousBalance: -50_000 }), 'septiembre')!;
    expect(text).not.toMatch(/[=+]/);
  });
});

/**
 * §25 · un pago entre miembros, en segunda persona y en las dos direcciones.
 * Hasta el 10/10 los pagos no se mostraban en ningún lado del espacio: el
 * saldo cambiaba y no se veía por qué.
 */
describe('paymentSentence', () => {
  it('el otro me pagó', () => {
    expect(paymentSentence({ fromSlot: 2, toSlot: 1, amount: 15_000 }, 1, 'Martina')).toBe(
      'Martina te pagó $15.000',
    );
  });

  it('yo le pagué al otro', () => {
    expect(paymentSentence({ fromSlot: 1, toSlot: 2, amount: 15_000 }, 1, 'Martina')).toBe(
      'Le pagaste $15.000 a Martina',
    );
  });

  it('visto desde el otro lado, el mismo pago se lee al revés', () => {
    expect(paymentSentence({ fromSlot: 2, toSlot: 1, amount: 15_000 }, 2, 'Renzo')).toBe(
      'Le pagaste $15.000 a Renzo',
    );
  });
});

/**
 * P6 · "Resumen fijo del saldo al momento de salir". Fijo: lo que pase
 * después (las cuotas que siguen, un pago) lo ve el que se quedó.
 */
describe('P6 · el saldo al salir', () => {
  const base = { viewerSlot: 2 as const, otherMemberName: 'Renzo' };

  it('en pasado, porque es una foto', () => {
    expect(departureBalanceSentence({ ...base, amount: 30_000, settled: false })).toBe(
      'Al salir, Renzo te debía $30.000.',
    );
    expect(departureBalanceSentence({ ...base, amount: -10_000, settled: false })).toBe(
      'Al salir, le debías $10.000 a Renzo.',
    );
    expect(departureBalanceSentence({ ...base, amount: 0, settled: true })).toBe(
      'Al salir, estaban a mano.',
    );
  });
});

/**
 * Montos · 11 · el N1 del espacio pone la frase y la cifra en líneas separadas,
 * para que sea la cifra la que se ajuste. Dicen exactamente lo mismo que
 * `balanceSentence`.
 */
describe('balanceLines · la frase del saldo en líneas', () => {
  const base = { viewerSlot: 1 as const, otherMemberName: 'Martina' };

  it('el otro te debe: la frase arriba y la cifra aparte', () => {
    const balance = { ...base, amount: 20_000, settled: false };
    expect(balanceLines(balance)).toEqual({ lead: 'Martina te debe', amount: 20_000, tail: null });
  });

  it('le debés: la cifra en el medio y a quién después', () => {
    const balance = { ...base, amount: -20_000, settled: false };
    expect(balanceLines(balance)).toEqual({ lead: 'Le debés', amount: 20_000, tail: 'a Martina' });
  });

  it('a mano: sin cifra', () => {
    const balance = { ...base, amount: 0, settled: true };
    expect(balanceLines(balance)).toEqual({ lead: 'Están a mano', amount: null, tail: null });
  });

  it('unidas dicen lo mismo que balanceSentence', () => {
    for (const balance of [
      { ...base, amount: 20_000, settled: false },
      { ...base, amount: -999_999_999, settled: false },
      { ...base, amount: 0, settled: true },
    ]) {
      const lines = balanceLines(balance);
      const joined = [lines.lead, lines.amount == null ? null : formatPesos(lines.amount), lines.tail]
        .filter((part) => part != null)
        .join(' ');
      expect(joined).toBe(balanceSentence(balance));
    }
  });
});
