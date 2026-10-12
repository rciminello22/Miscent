import { describe, it, expect } from 'vitest';
import {
  alreadyInLine,
  anotherOneQuestion,
  installmentsInSpaceLine,
} from './alreadyInSpacesCopy';

const enCasa = { spaceName: 'Casa', myShare: 250_000 };
const enViaje = { spaceName: 'Viaje', myShare: 20_000 };

describe('CA-09 · el texto de "Ya en [espacio]"', () => {
  it('Caso 10 · "Ya en Casa · tu parte $250.000"', () => {
    expect(alreadyInLine(enCasa)).toBe('Ya en Casa · tu parte $250.000');
  });
});

describe('§11 paso 3 · "¿Es otro alquiler?"', () => {
  it('con un espacio, el texto literal de §11', () => {
    expect(anotherOneQuestion('Alquiler', '¿Es otro alquiler?', [enCasa])).toBe(
      'Alquiler ya está en Casa (tu parte $250.000). ¿Es otro alquiler?',
    );
  });

  it('con dos espacios, nombra los dos', () => {
    expect(anotherOneQuestion('Alquiler', '¿Es otro alquiler?', [enCasa, enViaje])).toBe(
      'Alquiler ya está en Casa (tu parte $250.000) y en Viaje (tu parte $20.000). ¿Es otro alquiler?',
    );
  });
});

describe('§13 O3 paso 4 · cuotas compartidas que ya existen', () => {
  it('dice cuántas faltan, de cuánto, y tu parte', () => {
    expect(
      installmentsInSpaceLine({
        label: 'Heladera',
        spaceName: 'Casa',
        remaining: 6,
        installmentAmount: 100_000,
        myShare: 50_000,
      }),
    ).toBe('Heladera · Casa · faltan 6 cuotas de $100.000 · tu parte $50.000');
  });

  it('en singular cuando falta una', () => {
    expect(
      installmentsInSpaceLine({
        label: 'Heladera',
        spaceName: 'Casa',
        remaining: 1,
        installmentAmount: 100_000,
        myShare: 50_000,
      }),
    ).toBe('Heladera · Casa · falta 1 cuota de $100.000 · tu parte $50.000');
  });
});
