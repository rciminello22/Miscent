import { describe, it, expect } from 'vitest';
import { isInsideSpace, spaceBackTarget, spaceHref, spaceSubHref } from './spaceNavigation';

/**
 * Decisión del 9/10 · dentro de un espacio se oculta el "Agregar" flotante
 * (que abre con "Solo yo", CA-10) y queda solo el del espacio. Dos botones
 * parecidos con destinos distintos es el riesgo que §32 marca como "rompe
 * privacidad".
 *
 * P23 (15/10) · la pestaña Compartidos abre SIEMPRE en la lista, aunque haya un
 * solo espacio. La lista no es "adentro de un espacio": ahí el botón Agregar
 * personal sí está.
 */
describe('isInsideSpace', () => {
  it('un espacio dentro de la pestaña', () => {
    expect(isInsideSpace('/compartidos/abc-123')).toBe(true);
  });

  it('las pantallas de detalle de un espacio también son estar adentro', () => {
    expect(isInsideSpace('/compartidos/abc-123/mes')).toBe(true);
    expect(isInsideSpace('/compartidos/abc-123/movimientos')).toBe(true);
    expect(isInsideSpace('/compartidos/abc-123/pendientes')).toBe(true);
  });

  it('P23 · la lista no es un espacio, tenga uno solo o varios', () => {
    expect(isInsideSpace('/compartidos')).toBe(false);
  });

  it('el resto de las pestañas', () => {
    expect(isInsideSpace('/inicio')).toBe(false);
    expect(isInsideSpace('/movimientos')).toBe(false);
  });
});

/**
 * Abrir un espacio. Con cuenta personal, adentro de la pestaña Compartidos
 * (la barra queda visible); el invitado, en su pantalla sin pestañas (CA-06).
 */
describe('spaceHref', () => {
  it('P23 · personal: siempre el espacio concreto dentro de la pestaña, aunque sea el único', () => {
    expect(spaceHref({ accountState: 'personal', spaceId: 'casa' })).toBe(
      '/(personal)/compartidos/casa',
    );
  });

  it('invitado: siempre su pantalla sin pestañas', () => {
    expect(spaceHref({ accountState: 'guest', spaceId: 'casa' })).toBe('/space/casa');
  });
});

/**
 * Las pantallas de detalle del espacio (N3) viven en los DOS árboles: con
 * cuenta personal, adentro de la pestaña (la barra queda visible); el invitado,
 * en /space/[id], sin pestañas.
 */
describe('spaceSubHref', () => {
  it('personal: adentro de la pestaña Compartidos', () => {
    expect(spaceSubHref({ accountState: 'personal', spaceId: 'casa', screen: 'mes' })).toBe(
      '/(personal)/compartidos/casa/mes',
    );
    expect(
      spaceSubHref({ accountState: 'personal', spaceId: 'casa', screen: 'movimientos' }),
    ).toBe('/(personal)/compartidos/casa/movimientos');
    expect(spaceSubHref({ accountState: 'personal', spaceId: 'casa', screen: 'pendientes' })).toBe(
      '/(personal)/compartidos/casa/pendientes',
    );
  });

  it('invitado: bajo /space/[id], sin pestañas', () => {
    expect(spaceSubHref({ accountState: 'guest', spaceId: 'casa', screen: 'mes' })).toBe(
      '/space/casa/mes',
    );
    expect(spaceSubHref({ accountState: 'guest', spaceId: 'casa', screen: 'pendientes' })).toBe(
      '/space/casa/pendientes',
    );
  });

  it('lleva el mes elegido como parámetro', () => {
    expect(
      spaceSubHref({ accountState: 'personal', spaceId: 'casa', screen: 'mes', month: '2026-11' }),
    ).toBe('/(personal)/compartidos/casa/mes?mes=2026-11');
    expect(
      spaceSubHref({ accountState: 'guest', spaceId: 'casa', screen: 'mes', month: '2026-11' }),
    ).toBe('/space/casa/mes?mes=2026-11');
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
  it('P23 · con cuenta personal, la lista de Compartidos, con uno o con varios espacios', () => {
    expect(spaceBackTarget({ accountState: 'personal', spaceCount: 1 })).toBe('/(personal)/compartidos');
    expect(spaceBackTarget({ accountState: 'personal', spaceCount: 3 })).toBe('/(personal)/compartidos');
  });

  it('invitado con un solo espacio: no hay a dónde volver, el espacio ES su pantalla (§33 U1)', () => {
    expect(spaceBackTarget({ accountState: 'guest', spaceCount: 1 })).toBeNull();
  });

  it('invitado con varios espacios: su lista', () => {
    expect(spaceBackTarget({ accountState: 'guest', spaceCount: 2 })).toBe('/(guest)/espacios');
  });

  it('mientras no se sabe cuántos espacios hay: la lista de Compartidos o nada, nunca un destino que rebote', () => {
    expect(spaceBackTarget({ accountState: 'personal', spaceCount: null })).toBe('/(personal)/compartidos');
    expect(spaceBackTarget({ accountState: 'guest', spaceCount: null })).toBeNull();
  });
});
