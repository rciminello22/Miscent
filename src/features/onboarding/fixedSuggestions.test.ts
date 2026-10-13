/**
 * §13 O3 paso 5 · las sugerencias de fijos, con Luz, Gas y Agua separados y un
 * fijo propio ("Monotributo", "Telepase") para lo que no está en la lista.
 */

import { describe, it, expect } from 'vitest';
import {
  SUGGESTIONS,
  fixedToSave,
  matchesSuggestion,
  type CustomFixed,
} from './fixedSuggestions';

const suggestion = (key: string) => SUGGESTIONS.find((item) => item.key === key)!;

describe('las sugerencias', () => {
  it('Luz, Gas y Agua van por separado, los tres en Servicios', () => {
    const servicios = SUGGESTIONS.filter((item) => item.category === 'servicios');
    expect(servicios.map((item) => item.description)).toEqual(['Luz', 'Gas', 'Agua']);
  });

  it('siguen las de §13: alquiler, expensas, internet, celular, gimnasio, streaming, prepaga', () => {
    expect(SUGGESTIONS.map((item) => item.label)).toEqual([
      'Alquiler',
      'Expensas',
      'Luz',
      'Gas',
      'Agua',
      'Internet',
      'Celular',
      'Gimnasio',
      'Streaming',
      'Prepaga',
    ]);
  });
});

describe('CA-09 · qué sugerencia ya está en un espacio', () => {
  it('un "Luz" compartido avisa en Luz, y no en Gas', () => {
    const luz = { category: 'servicios' as const, description: 'Luz' };
    expect(matchesSuggestion(luz, suggestion('luz'))).toBe(true);
    expect(matchesSuggestion(luz, suggestion('gas'))).toBe(false);
  });

  it('sin importar mayúsculas ni espacios', () => {
    const luz = { category: 'servicios' as const, description: '  LUZ ' };
    expect(matchesSuggestion(luz, suggestion('luz'))).toBe(true);
  });

  it('un "Servicios" compartido sin nombre puede ser cualquiera de los tres: avisa en los tres', () => {
    const servicios = { category: 'servicios' as const, description: null };
    expect(matchesSuggestion(servicios, suggestion('luz'))).toBe(true);
    expect(matchesSuggestion(servicios, suggestion('gas'))).toBe(true);
    expect(matchesSuggestion(servicios, suggestion('agua'))).toBe(true);
  });

  it('un alquiler con otro nombre sigue siendo un alquiler', () => {
    const depto = { category: 'alquiler' as const, description: 'Alquiler depto' };
    expect(matchesSuggestion(depto, suggestion('alquiler'))).toBe(true);
  });

  it('otra categoría nunca coincide', () => {
    const internet = { category: 'internet' as const, description: null };
    expect(matchesSuggestion(internet, suggestion('luz'))).toBe(false);
  });
});

describe('lo que se guarda', () => {
  it('cada sugerencia con monto se guarda con su categoría y su nombre', () => {
    const result = fixedToSave(
      {
        luz: { amount: 40_000, dayOfMonth: 15 },
        alquiler: { amount: 500_000, dayOfMonth: 10 },
      },
      [],
    );

    expect(result).toEqual([
      { category: 'alquiler', description: null, amount: 500_000, dayOfMonth: 10 },
      { category: 'servicios', description: 'Luz', amount: 40_000, dayOfMonth: 15 },
    ]);
  });

  it('un fijo propio: "Monotributo" en Impuestos', () => {
    const monotributo: CustomFixed = {
      key: 'c1',
      name: 'Monotributo',
      category: 'impuestos',
      amount: 35_000,
      dayOfMonth: 20,
    };

    expect(fixedToSave({}, [monotributo])).toEqual([
      { category: 'impuestos', description: 'Monotributo', amount: 35_000, dayOfMonth: 20 },
    ]);
  });

  it('sin monto no se guarda: una sugerencia tildada y vacía no es un fijo', () => {
    const vacio: CustomFixed = {
      key: 'c1',
      name: 'Telepase',
      category: 'transporte',
      amount: 0,
      dayOfMonth: 1,
    };
    expect(fixedToSave({ luz: { amount: 0, dayOfMonth: 1 } }, [vacio])).toEqual([]);
  });

  it('un fijo propio sin nombre no se guarda: sin nombre no se distingue de nada', () => {
    const sinNombre: CustomFixed = {
      key: 'c1',
      name: '   ',
      category: 'impuestos',
      amount: 35_000,
      dayOfMonth: 20,
    };
    expect(fixedToSave({}, [sinNombre])).toEqual([]);
  });
});
