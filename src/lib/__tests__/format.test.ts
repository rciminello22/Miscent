import { describe, it, expect } from 'vitest';
import {
  formatDayMonth,
  formatInstallment,
  formatLongDate,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatPaymentWhen,
  formatPesos,
} from '../format';

describe('formato de montos', () => {
  it('agrupa de a tres con punto, como se escribe en Argentina', () => {
    expect(formatPesos(1_200_000)).toBe('$1.200.000');
    expect(formatPesos(320_000)).toBe('$320.000');
    expect(formatPesos(50_000)).toBe('$50.000');
    expect(formatPesos(1_000)).toBe('$1.000');
    expect(formatPesos(999)).toBe('$999');
    expect(formatPesos(0)).toBe('$0');
  });

  it('G-02 · nunca muestra decimales: ni coma decimal ni centavos', () => {
    // En es-AR la coma es el separador decimal: no debe aparecer nunca.
    expect(formatPesos(1_200_000)).not.toContain(',');
    // Un monto con decimales (que no debería existir) se redondea, no se trunca
    // ni arrastra centavos a la pantalla.
    expect(formatPesos(1_200_000.4)).toBe('$1.200.000');
    expect(formatPesos(1_200_000.6)).toBe('$1.200.001');
    expect(/^\$[\d.]+$/.test(formatPesos(1_200_000))).toBe(true);
  });

  it('N-08 · un negativo usa el signo menos tipográfico', () => {
    // El contexto lo explica con "superan tus ingresos registrados por $X",
    // así que la cifra en sí se muestra sin signo cuando se pide.
    expect(formatPesos(-35_000)).toBe('−$35.000');
    expect(formatPesos(-35_000, { sign: 'never' })).toBe('$35.000');
  });

  it('formatNumber deja el monto sin el signo de pesos', () => {
    expect(formatNumber(1_200_000)).toBe('1.200.000');
  });
});

describe('formato de meses', () => {
  it('nombra el mes en minúscula, como en el microcopy de §33', () => {
    expect(formatMonth('2026-10')).toBe('octubre');
    expect(formatMonth('2026-01')).toBe('enero');
    expect(formatMonth('2026-12')).toBe('diciembre');
  });

  it('agrega el año solo cuando no es el de referencia', () => {
    expect(formatMonth('2026-10', '2026-10')).toBe('octubre');
    expect(formatMonth('2027-03', '2026-10')).toBe('marzo de 2027');
  });

  it('abrevia para las barras de Futuro', () => {
    expect(formatMonthShort('2026-11')).toBe('Nov');
    expect(formatMonthShort('2027-01')).toBe('Ene');
    expect(formatMonthShort('2026-09')).toBe('Sep');
  });
});

describe('formato de fechas', () => {
  it('§15 · "5 oct" en Próximos pagos', () => {
    expect(formatDayMonth('2026-10-05')).toBe('5 oct');
    expect(formatDayMonth('2026-11-15')).toBe('15 nov');
    expect(formatDayMonth('2027-01-01')).toBe('1 ene');
  });

  it('formato largo para textos corridos', () => {
    expect(formatLongDate('2026-11-05')).toBe('5 de noviembre');
  });

  it('T-05 · sin día conocido muestra el mes, nunca una fecha inventada', () => {
    expect(formatPaymentWhen({ date: '2026-11-05', month: '2026-11' })).toBe('5 nov');
    expect(formatPaymentWhen({ date: null, month: '2026-11' })).toBe('noviembre');
  });
});

describe('cuotas', () => {
  it('§20 · "3 de 6"', () => {
    expect(formatInstallment(3, 6)).toBe('3 de 6');
  });
});
