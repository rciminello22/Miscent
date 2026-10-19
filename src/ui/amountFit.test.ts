import { describe, it, expect } from 'vitest';
import { FIT_MIN_FONT_SIZE, fitPropsFor } from './amountFit';

/**
 * Las cifras grandes (display y title) se achican solas hasta un mínimo legible
 * de 20pt; las chicas nunca se tocan. Sin abreviar: nunca "$1,2 M".
 */

describe('fitPropsFor · qué cifras se ajustan', () => {
  it('el mínimo legible es 20pt', () => {
    expect(FIT_MIN_FONT_SIZE).toBe(20);
  });

  it('display (34pt) baja hasta 20pt en una sola línea', () => {
    const props = fitPropsFor('display', 34);
    expect(props).not.toBeNull();
    expect(props?.numberOfLines).toBe(1);
    expect(props?.adjustsFontSizeToFit).toBe(true);
    expect((props?.minimumFontScale ?? 0) * 34).toBeCloseTo(20, 5);
  });

  it('title (24pt) baja hasta 20pt', () => {
    const props = fitPropsFor('title', 24);
    expect((props?.minimumFontScale ?? 0) * 24).toBeCloseTo(20, 5);
  });

  it('las variantes chicas no se ajustan: el que cede es el texto vecino', () => {
    expect(fitPropsFor('heading', 18)).toBeNull();
    expect(fitPropsFor('bodyMedium', 16)).toBeNull();
    expect(fitPropsFor('smallMedium', 14)).toBeNull();
    expect(fitPropsFor('caption', 12)).toBeNull();
  });

  it('una variante grande que ya está en el mínimo no tiene a dónde achicarse', () => {
    expect(fitPropsFor('title', 20)?.minimumFontScale).toBe(1);
  });
});
