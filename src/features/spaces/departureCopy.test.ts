import { describe, it, expect } from 'vitest';
import { keepDetail, pendingFixedLine, spaceContext, stoppedQuestion } from './departureCopy';

describe('SA-04 · §27 · la pregunta sobre cada fijo detenido', () => {
  it('§27 · "El alquiler era compartido con Martina. ¿Lo seguís pagando vos?"', () => {
    expect(stoppedQuestion({ label: 'Alquiler', otherName: 'Martina', canKeep: true })).toBe(
      '"Alquiler" era compartido con Martina. ¿Lo seguís pagando vos?',
    );
  });

  it('sin cuenta personal no hay "mis fijos" (A-05): se avisa, no se pregunta', () => {
    expect(stoppedQuestion({ label: 'Alquiler', otherName: 'Martina', canKeep: false })).toBe(
      '"Alquiler" era compartido con Martina y dejó de serlo cuando salió.',
    );
  });

  it('Caso 13 · pasarlo es por el total: lo dice antes de que elija', () => {
    expect(keepDetail(500_000)).toBe('En tus fijos cuenta entero: $500.000 por mes.');
  });
});

describe('Inicio · "Tus espacios"', () => {
  it('uno', () => {
    expect(pendingFixedLine(1)).toBe('Hay 1 fijo para revisar');
  });

  it('varios', () => {
    expect(pendingFixedLine(2)).toBe('Hay 2 fijos para revisar');
  });
});

describe('SA-05 · §33 · el espacio de quien ya salió', () => {
  it('"Casa · ya no sos miembro"', () => {
    expect(spaceContext('Casa', true)).toBe('Casa · ya no sos miembro');
    expect(spaceContext('Casa', false)).toBe('Casa');
  });
});
