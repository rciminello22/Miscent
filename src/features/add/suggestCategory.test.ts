import { describe, it, expect } from 'vitest';
import { suggestCategory } from './suggestCategory';

/**
 * Should 8 · "categoría sugerida según la descripción". Sugiere, nunca
 * elige sola: la pantalla muestra "¿Es Supermercado?" y el usuario decide.
 */
describe('categoría sugerida según la descripción', () => {
  it('por palabras conocidas, sin importar mayúsculas ni acentos', () => {
    expect(suggestCategory('Coto', 'expense', [])).toBe('supermercado');
    expect(suggestCategory('Netflix', 'expense', [])).toBe('suscripciones');
    expect(suggestCategory('cena con amigos', 'expense', [])).toBe('gastronomia');
    expect(suggestCategory('Carga SUBE', 'expense', [])).toBe('transporte');
    expect(suggestCategory('Médico', 'expense', [])).toBe('salud');
    expect(suggestCategory('Monotributo', 'expense', [])).toBe('impuestos');
  });

  it('una palabra que empieza igual también: "supermercado", "farmacity"', () => {
    expect(suggestCategory('Supermercado chino', 'expense', [])).toBe('supermercado');
    expect(suggestCategory('Farmacity', 'expense', [])).toBe('farmacia');
  });

  it('las palabras cortas solo enteras: "día" no es "diario"', () => {
    expect(suggestCategory('Día', 'expense', [])).toBe('supermercado');
    expect(suggestCategory('diario', 'expense', [])).toBeNull();
  });

  it('lo que el usuario ya cargó con esa descripción pesa más que las palabras', () => {
    const history = [
      { description: 'Coto', category: 'hogar' as const },
      { description: 'coto', category: 'hogar' as const },
      { description: 'Coto', category: 'supermercado' as const },
    ];
    expect(suggestCategory('coto', 'expense', history)).toBe('hogar');
  });

  it('los ingresos, entre las categorías de ingreso', () => {
    expect(suggestCategory('Sueldo octubre', 'income', [])).toBe('sueldo');
    expect(suggestCategory('Freelance', 'income', [])).toBe('extra');
    expect(suggestCategory('Netflix', 'income', [])).toBeNull();
  });

  it('sin nada que reconocer, no adivina', () => {
    expect(suggestCategory('cosas varias', 'expense', [])).toBeNull();
    expect(suggestCategory('  ', 'expense', [])).toBeNull();
  });
});
