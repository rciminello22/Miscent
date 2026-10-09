import { describe, it, expect } from 'vitest';
import { isInsideSpace, spaceBackTarget, spaceHref } from './spaceNavigation';

/**
 * Decisión del 9/10 · dentro de un espacio se oculta el "Agregar" flotante
 * (que abre con "Solo yo", CA-10) y queda solo el del espacio. Dos botones
 * parecidos con destinos distintos es el riesgo que §32 marca como "rompe
 * privacidad".
 */
describe('isInsideSpace', () => {
  it('un espacio dentro de la pestaña', () => {
    expect(isInsideSpace('/compartidos/abc-123', 2)).toBe(true);
  });

  it('la pestaña con un solo espacio lo muestra: también es estar adentro', () => {
    expect(isInsideSpace('/compartidos', 1)).toBe(true);
  });

  it('la lista de varios espacios no es un espacio', () => {
    expect(isInsideSpace('/compartidos', 3)).toBe(false);
    expect(isInsideSpace('/compartidos', 0)).toBe(false);
    expect(isInsideSpace('/compartidos', null)).toBe(false);
  });

  it('el resto de las pestañas', () => {
    expect(isInsideSpace('/inicio', 1)).toBe(false);
    expect(isInsideSpace('/movimientos', 1)).toBe(false);
  });
});

/**
 * Abrir un espacio. Con cuenta personal, adentro de la pestaña Compartidos
 * (la barra queda visible); el invitado, en su pantalla sin pestañas (CA-06).
 */
describe('spaceHref', () => {
  it('personal con un solo espacio: la pestaña, que ya lo muestra', () => {
    expect(spaceHref({ accountState: 'personal', spaceId: 'casa', spaceCount: 1 })).toBe(
      '/(personal)/compartidos',
    );
  });

  it('personal con varios: el espacio dentro de la pestaña', () => {
    expect(spaceHref({ accountState: 'personal', spaceId: 'casa', spaceCount: 2 })).toBe(
      '/(personal)/compartidos/casa',
    );
  });

  it('si todavía no se sabe cuántos hay, el espacio concreto: nunca otro distinto', () => {
    expect(spaceHref({ accountState: 'personal', spaceId: 'casa', spaceCount: null })).toBe(
      '/(personal)/compartidos/casa',
    );
  });

  it('invitado: siempre su pantalla sin pestañas', () => {
    expect(spaceHref({ accountState: 'guest', spaceId: 'casa', spaceCount: 1 })).toBe('/space/casa');
    expect(spaceHref({ accountState: 'guest', spaceId: 'casa', spaceCount: 3 })).toBe('/space/casa');
  });
});

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
