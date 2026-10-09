import { describe, it, expect } from 'vitest';
import { spaceBackTarget } from './spaceNavigation';

/**
 * "Volver" desde un espacio va a un destino FIJO, no a "lo que haya atrás".
 *
 * El 9/10 el historial tenía las pantallas del login debajo del espacio: back()
 * caía en una de ellas, el RouteGuard rebotaba al usuario a su pantalla
 * principal y, con un solo espacio, esa pantalla entraba directo al espacio
 * otra vez. Un loop que parecía "no puedo salir".
 */
describe('spaceBackTarget', () => {
  it('con cuenta personal y un solo espacio: Inicio (Compartidos entraría directo otra vez)', () => {
    expect(spaceBackTarget({ accountState: 'personal', spaceCount: 1 })).toBe('/(personal)/inicio');
  });

  it('con cuenta personal y varios espacios: la lista de Compartidos', () => {
    expect(spaceBackTarget({ accountState: 'personal', spaceCount: 3 })).toBe('/(personal)/compartidos');
  });

  it('invitado con un solo espacio: no hay a dónde volver, el espacio ES su pantalla (§33 U1)', () => {
    expect(spaceBackTarget({ accountState: 'guest', spaceCount: 1 })).toBeNull();
  });

  it('invitado con varios espacios: su lista', () => {
    expect(spaceBackTarget({ accountState: 'guest', spaceCount: 2 })).toBe('/(guest)/espacios');
  });

  it('mientras no se sabe cuántos espacios hay, como si fuera uno: nunca un destino que rebote', () => {
    expect(spaceBackTarget({ accountState: 'personal', spaceCount: null })).toBe('/(personal)/inicio');
    expect(spaceBackTarget({ accountState: 'guest', spaceCount: null })).toBeNull();
  });
});
