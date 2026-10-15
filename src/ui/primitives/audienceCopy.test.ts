import { describe, expect, it } from 'vitest';
import { audienceLabel, audienceSentence } from './audienceCopy';

/**
 * §12 · PR-03 · los textos de la audiencia. TS puro.
 */

describe('audienceLabel · la marca corta de las listas (§33)', () => {
  it('lo privado dice "Solo vos"', () => {
    expect(audienceLabel({ kind: 'private' })).toBe('Solo vos');
  });

  it('lo compartido nombra al otro', () => {
    expect(audienceLabel({ kind: 'shared', otherMemberName: 'Martina' })).toBe(
      'Lo ven vos y Martina',
    );
  });
});

describe('audienceSentence · la frase junto al botón de guardar (§12)', () => {
  it('lo privado: "Solo vos lo ves"', () => {
    expect(audienceSentence({ kind: 'private' })).toBe('Solo vos lo ves');
  });

  it('lo compartido: "Lo ven vos y [nombre]"', () => {
    expect(audienceSentence({ kind: 'shared', otherMemberName: 'Martina' })).toBe(
      'Lo ven vos y Martina',
    );
  });
});
