import { describe, it, expect } from 'vitest';
import { debito, mastercard, visa } from '@domain/__tests__/fixtures';
import type { PaymentMethod } from '@domain/types';
import { cardScheduleLine, selectCards } from './cards';

/**
 * UX-21 · Perfil > Tarjetas: la lista y el número de la fila de Perfil salen
 * de la misma función.
 */
describe('UX-21 · selectCards', () => {
  it('deja solo las tarjetas de crédito: ni débito ni transferencia', () => {
    expect(selectCards([debito, visa]).map((card) => card.id)).toEqual(['visa']);
  });

  it('las ordena por nombre, sin importar cómo vengan de la base', () => {
    const result = selectCards([visa, mastercard]);
    expect(result.map((card) => card.name)).toEqual(['Mastercard', 'Visa Galicia']);
  });

  it('no muta lo que recibe', () => {
    const input = [visa, mastercard];
    selectCards(input);
    expect(input.map((card) => card.id)).toEqual(['visa', 'master']);
  });

  it('P24 · una tarjeta eliminada no está en la lista ni en el conteo', () => {
    const result = selectCards([{ ...visa, deleted: true }, mastercard]);
    expect(result.map((card) => card.id)).toEqual(['master']);
  });

  it('sin tarjetas, la lista está vacía', () => {
    expect(selectCards([debito])).toEqual([]);
  });
});

describe('cardScheduleLine · T-02', () => {
  it('con los dos días, los dice', () => {
    expect(cardScheduleLine(visa)).toBe('Cierra el 25, vence el 5');
  });

  it('T-02 · un día "Más o menos" va con "~" y la línea dice "aprox."', () => {
    const aprox: PaymentMethod = { ...visa, closingDay: 15, closingApprox: true };
    expect(cardScheduleLine(aprox)).toBe('Cierra el ~15, vence el 5 · aprox.');
    const ambos: PaymentMethod = { ...aprox, dueDay: 2, dueApprox: true };
    expect(cardScheduleLine(ambos)).toBe('Cierra el ~15, vence el ~2 · aprox.');
  });

  it('con algún día en "No sé", la fecha es aproximada y nunca se inventa un día', () => {
    const sinDias: PaymentMethod = { ...visa, closingDay: null, dueDay: null };
    const soloCierre: PaymentMethod = { ...visa, dueDay: null };
    expect(cardScheduleLine(sinDias)).toBe('Fechas aproximadas');
    expect(cardScheduleLine(soloCierre)).toBe('Fechas aproximadas');
  });
});
