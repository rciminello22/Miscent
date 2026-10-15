import { describe, expect, it } from 'vitest';
import {
  INSTALLMENT_MAX,
  INSTALLMENT_MIN,
  installmentCountIssue,
  installmentCountMessage,
  isValidInstallmentCount,
  parseInstallmentCount,
} from './installmentCount';

/**
 * UX-06 · §17 campo 8 · la cantidad de cuotas "Otra". TS puro.
 */

describe('el rango', () => {
  it('va de 2 a 36', () => {
    expect(INSTALLMENT_MIN).toBe(2);
    expect(INSTALLMENT_MAX).toBe(36);
  });
});

describe('parseInstallmentCount · lo que se tipea', () => {
  it('un campo vacío es "sin cantidad"', () => {
    expect(parseInstallmentCount('')).toBeNull();
    expect(parseInstallmentCount('   ')).toBeNull();
  });

  it('lee números enteros', () => {
    expect(parseInstallmentCount('24')).toBe(24);
    expect(parseInstallmentCount('2')).toBe(2);
    expect(parseInstallmentCount('1')).toBe(1);
  });

  it('ignora lo que no es un dígito', () => {
    expect(parseInstallmentCount('2a4')).toBe(24);
    expect(parseInstallmentCount('1,5')).toBe(15);
    expect(parseInstallmentCount('abc')).toBeNull();
  });

  it('0 es un número (y después se rechaza), no "vacío"', () => {
    expect(parseInstallmentCount('0')).toBe(0);
  });

  it('no deja pasar más de dos dígitos', () => {
    expect(parseInstallmentCount('123')).toBe(12);
  });
});

describe('installmentCountIssue · §17 "Cuotas menores a 2"', () => {
  it('sin cantidad no hay problema: no pidió cuotas', () => {
    expect(installmentCountIssue(null)).toBeNull();
  });

  it('de 2 a 36 es válido', () => {
    for (const count of [2, 3, 10, 24, 36]) {
      expect(installmentCountIssue(count)).toBeNull();
      expect(isValidInstallmentCount(count)).toBe(true);
    }
  });

  it('menos de 2 es "too-few", incluido 1 y 0', () => {
    expect(installmentCountIssue(1)).toBe('too-few');
    expect(installmentCountIssue(0)).toBe('too-few');
    expect(isValidInstallmentCount(1)).toBe(false);
  });

  it('más de 36 es "too-many"', () => {
    expect(installmentCountIssue(37)).toBe('too-many');
    expect(installmentCountIssue(99)).toBe('too-many');
    expect(isValidInstallmentCount(37)).toBe(false);
  });

  it('null no es una cantidad válida de cuotas', () => {
    expect(isValidInstallmentCount(null)).toBe(false);
  });
});

describe('installmentCountMessage', () => {
  it('1 cuota usa el texto de la spec', () => {
    expect(installmentCountMessage('too-few')).toBe('Para una sola cuota, desactivá En cuotas.');
  });

  it('más de 36 explica el tope', () => {
    expect(installmentCountMessage('too-many')).toBe('Hasta 36 cuotas.');
  });
});
