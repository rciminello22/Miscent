import { describe, it, expect } from 'vitest';
import { markAllLabel, reviewTag, toReviewLine } from './reviewCopy';

describe('Opción B · el texto de "para revisar"', () => {
  it('en cada registro: quién lo cargó (autoría visible, K3)', () => {
    expect(reviewTag('Martina')).toBe('Lo cargó Martina · para revisar');
  });

  it('el resumen, en singular y en plural', () => {
    expect(toReviewLine(1)).toBe('1 cosa para revisar');
    expect(toReviewLine(4)).toBe('4 cosas para revisar');
  });

  it('el botón para marcar todo', () => {
    expect(markAllLabel(1)).toBe('Está bien');
    expect(markAllLabel(4)).toBe('Están bien');
  });
});
