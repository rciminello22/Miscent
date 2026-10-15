import { describe, expect, it } from 'vitest';
import type { Category } from '@domain/types';
import { canSaveForm, saveBlockReason } from './saveBlockReason';

/**
 * UX-16 · §17 · "Monto vacío o cero: Guardar deshabilitado". Y ahora, el motivo.
 */

const OK = {
  amount: 12_000,
  category: 'supermercado' as Category | null,
  installmentCount: null,
  destinationLoading: false,
};

describe('saveBlockReason', () => {
  it('un formulario completo no tiene motivo', () => {
    expect(saveBlockReason(OK)).toBeNull();
  });

  it('monto mayor que 0 y sin categoría: "Elegí una categoría"', () => {
    expect(saveBlockReason({ ...OK, category: null })).toBe('Elegí una categoría');
  });

  it('categoría elegida y sin monto: "Ingresá un monto"', () => {
    expect(saveBlockReason({ ...OK, amount: 0 })).toBe('Ingresá un monto');
  });

  it('el formulario recién abierto no reta a nadie', () => {
    expect(saveBlockReason({ ...OK, amount: 0, category: null })).toBeNull();
  });

  it('una cantidad de cuotas inválida lo dice, incluido el 1 de "Otra"', () => {
    expect(saveBlockReason({ ...OK, installmentCount: 1 })).toBe('Revisá la cantidad de cuotas');
    expect(saveBlockReason({ ...OK, installmentCount: 40 })).toBe('Revisá la cantidad de cuotas');
  });

  it('una cantidad válida de cuotas no bloquea', () => {
    expect(saveBlockReason({ ...OK, installmentCount: 24 })).toBeNull();
  });

  it('con el espacio todavía cargando, avisa antes de guardar en el lugar equivocado', () => {
    expect(saveBlockReason({ ...OK, destinationLoading: true })).toBe('Cargando el espacio');
  });

  it('lo primero que falta es lo que se dice', () => {
    expect(
      saveBlockReason({ ...OK, category: null, installmentCount: 1, destinationLoading: true }),
    ).toBe('Elegí una categoría');
  });
});

describe('canSaveForm', () => {
  it('se puede guardar cuando no falta nada', () => {
    expect(canSaveForm(OK)).toBe(true);
  });

  it('no se puede sin monto, sin categoría, con cuotas inválidas o con el espacio cargando', () => {
    expect(canSaveForm({ ...OK, amount: 0 })).toBe(false);
    expect(canSaveForm({ ...OK, category: null })).toBe(false);
    expect(canSaveForm({ ...OK, installmentCount: 1 })).toBe(false);
    expect(canSaveForm({ ...OK, destinationLoading: true })).toBe(false);
  });

  it('el formulario vacío tampoco se guarda, aunque no tenga motivo para mostrar', () => {
    expect(canSaveForm({ ...OK, amount: 0, category: null })).toBe(false);
  });
});
