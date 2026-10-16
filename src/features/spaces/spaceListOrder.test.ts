import { describe, it, expect } from 'vitest';
import {
  FILTER_MIN_SPACES,
  SEARCH_MIN_SPACES,
  SPACE_FILTERS,
  emptyResultLine,
  isNarrowed,
  needsLook,
  orderSpaces,
  shownLine,
  showsFilter,
  showsSearch,
  visibleSpaces,
  type SpaceListItem,
} from './spaceListOrder';

/**
 * 3ii · la lista de Compartidos cuando crece: orden por reciente, filtro
 * opcional "Todos · Para mirar · A mano" desde 5 espacios y búsqueda desde 9.
 * Todo puro: la pantalla solo dibuja lo que sale de acá.
 */

function item(overrides: Partial<SpaceListItem> & { id: string }): SpaceListItem {
  return {
    name: overrides.id,
    otherName: 'Martina',
    ready: true,
    pending: 0,
    balance: 0,
    lastOpenedAt: null,
    ...overrides,
  };
}

describe('umbrales', () => {
  it('el filtro aparece desde 5 espacios', () => {
    expect(FILTER_MIN_SPACES).toBe(5);
    expect(showsFilter(4)).toBe(false);
    expect(showsFilter(5)).toBe(true);
    expect(showsFilter(12)).toBe(true);
  });

  it('la búsqueda aparece desde 9 espacios', () => {
    expect(SEARCH_MIN_SPACES).toBe(9);
    expect(showsSearch(8)).toBe(false);
    expect(showsSearch(9)).toBe(true);
  });

  it('los tres filtros, en orden, con "Todos" primero', () => {
    expect(SPACE_FILTERS.map((filter) => filter.label)).toEqual(['Todos', 'Para mirar', 'A mano']);
    expect(SPACE_FILTERS[0]!.key).toBe('all');
  });
});

describe('orderSpaces · del abierto más recientemente al menos reciente', () => {
  it('mezclados: el último que abriste va primero, sin importar saldo ni pendientes', () => {
    const ordered = orderSpaces([
      item({ id: 'viejo', lastOpenedAt: 1_000, pending: 3 }),
      item({ id: 'reciente', lastOpenedAt: 9_000 }),
      item({ id: 'medio', lastOpenedAt: 5_000, balance: 20_000 }),
    ]);

    expect(ordered.map((space) => space.id)).toEqual(['reciente', 'medio', 'viejo']);
  });

  it('sin dato de apertura, después de los que sí lo tienen, por nombre', () => {
    const ordered = orderSpaces([
      item({ id: 'a', name: 'Viaje' }),
      item({ id: 'b', name: 'Auto', lastOpenedAt: 100 }),
      item({ id: 'c', name: 'Casa' }),
      item({ id: 'd', name: 'Álbum' }),
    ]);

    expect(ordered.map((space) => space.name)).toEqual(['Auto', 'Álbum', 'Casa', 'Viaje']);
  });

  it('con la misma hora de apertura desempata por nombre', () => {
    const ordered = orderSpaces([
      item({ id: 'x', name: 'Mudanza', lastOpenedAt: 50 }),
      item({ id: 'y', name: 'Casa', lastOpenedAt: 50 }),
    ]);

    expect(ordered.map((space) => space.name)).toEqual(['Casa', 'Mudanza']);
  });

  it('no modifica la lista que recibe', () => {
    const input = [item({ id: 'a', lastOpenedAt: 1 }), item({ id: 'b', lastOpenedAt: 2 })];
    orderSpaces(input);

    expect(input.map((space) => space.id)).toEqual(['a', 'b']);
  });
});

describe('needsLook · "Para mirar"', () => {
  it('algo por revisar', () => {
    expect(needsLook(item({ id: 'a', pending: 1 }))).toBe(true);
  });

  it('un saldo distinto de cero, para cualquiera de los dos lados', () => {
    expect(needsLook(item({ id: 'a', balance: 20_000 }))).toBe(true);
    expect(needsLook(item({ id: 'a', balance: -8_500 }))).toBe(true);
  });

  it('a mano y sin nada por revisar no es para mirar', () => {
    expect(needsLook(item({ id: 'a' }))).toBe(false);
  });

  it('un ex miembro sin saldo ni pendientes tampoco', () => {
    expect(needsLook(item({ id: 'a', otherName: 'Camila' }))).toBe(false);
  });

  it('mientras sus cuentas no cargaron no se esconde: se mira', () => {
    expect(needsLook(item({ id: 'a', ready: false }))).toBe(true);
  });
});

describe('visibleSpaces', () => {
  const six = [
    item({ id: 'casa', name: 'Casa', pending: 2, balance: 20_000, lastOpenedAt: 6 }),
    item({ id: 'auto', name: 'Auto', balance: 4_200, otherName: 'Lucas', lastOpenedAt: 5 }),
    item({ id: 'familia', name: 'Familia', otherName: 'Paula', lastOpenedAt: 4 }),
    item({ id: 'mudanza', name: 'Mudanza', pending: 1, balance: -8_500, otherName: 'Sofía', lastOpenedAt: 3 }),
    item({ id: 'viaje', name: 'Viaje', otherName: 'Juan', lastOpenedAt: 2 }),
    item({ id: 'gimnasio', name: 'Gimnasio', otherName: 'Camila', lastOpenedAt: 1 }),
  ];

  it('"Todos" muestra todo, ordenado por reciente', () => {
    const shown = visibleSpaces(six, { filter: 'all', query: '' });

    expect(shown.map((space) => space.id)).toEqual([
      'casa',
      'auto',
      'familia',
      'mudanza',
      'viaje',
      'gimnasio',
    ]);
  });

  it('"Para mirar" recorta sin cambiar el orden', () => {
    const shown = visibleSpaces(six, { filter: 'watch', query: '' });

    expect(shown.map((space) => space.id)).toEqual(['casa', 'auto', 'mudanza']);
  });

  it('"A mano" es el resto', () => {
    const shown = visibleSpaces(six, { filter: 'even', query: '' });

    expect(shown.map((space) => space.id)).toEqual(['familia', 'viaje', 'gimnasio']);
  });

  it('con menos de 5 espacios el filtro guardado no se aplica', () => {
    const shown = visibleSpaces(six.slice(0, 4), { filter: 'even', query: '' });

    expect(shown).toHaveLength(4);
  });

  it('la búsqueda por el nombre del espacio, sin importar mayúsculas ni tildes', () => {
    const many = [
      ...six,
      item({ id: 'a1', name: 'Alquiler' }),
      item({ id: 'a2', name: 'Café' }),
      item({ id: 'a3', name: 'Oficina' }),
    ];

    expect(visibleSpaces(many, { filter: 'all', query: 'cafe' }).map((s) => s.id)).toEqual(['a2']);
    expect(visibleSpaces(many, { filter: 'all', query: '  MUDA ' }).map((s) => s.id)).toEqual(['mudanza']);
  });

  it('la búsqueda por el nombre de la persona', () => {
    const many = [
      ...six,
      item({ id: 'a1', name: 'Alquiler' }),
      item({ id: 'a2', name: 'Café' }),
      item({ id: 'a3', name: 'Oficina' }),
    ];

    expect(visibleSpaces(many, { filter: 'all', query: 'sofia' }).map((s) => s.id)).toEqual(['mudanza']);
  });

  it('con menos de 9 espacios la búsqueda guardada no se aplica', () => {
    const shown = visibleSpaces(six, { filter: 'all', query: 'zzz' });

    expect(shown).toHaveLength(6);
  });

  it('filtro y búsqueda se combinan', () => {
    const many = [
      ...six,
      item({ id: 'a1', name: 'Casa vieja', otherName: 'Marta', pending: 1 }),
      item({ id: 'a2', name: 'Casa de campo', otherName: 'Ana' }),
      item({ id: 'a3', name: 'Oficina' }),
    ];

    const shown = visibleSpaces(many, { filter: 'watch', query: 'casa' });

    expect(shown.map((space) => space.id).sort()).toEqual(['a1', 'casa']);
  });
});

describe('isNarrowed · si el filtro o la búsqueda recortan la lista', () => {
  it('con "Todos" y sin búsqueda, no', () => {
    expect(isNarrowed(6, { filter: 'all', query: '' })).toBe(false);
  });

  it('con un filtro elegido, sí', () => {
    expect(isNarrowed(6, { filter: 'watch', query: '' })).toBe(true);
  });

  it('con una búsqueda escrita, sí; con solo espacios, no', () => {
    expect(isNarrowed(10, { filter: 'all', query: 'casa' })).toBe(true);
    expect(isNarrowed(10, { filter: 'all', query: '   ' })).toBe(false);
  });

  it('un control que no corresponde a esta cantidad no recorta aunque haya algo guardado', () => {
    expect(isNarrowed(4, { filter: 'even', query: '' })).toBe(false);
    expect(isNarrowed(6, { filter: 'all', query: 'casa' })).toBe(false);
  });
});

describe('shownLine · "Mostrando N de M espacios"', () => {
  it('con un filtro aplicado', () => {
    expect(shownLine({ shown: 3, total: 6, narrowed: true })).toBe('Mostrando 3 de 6 espacios');
  });

  it('sin filtro ni búsqueda no hay línea', () => {
    expect(shownLine({ shown: 6, total: 6, narrowed: false })).toBeNull();
  });
});

describe('emptyResultLine', () => {
  it('dice por qué no hay nada, sin alarma', () => {
    expect(emptyResultLine({ filter: 'watch', query: '' })).toBe('No hay nada para mirar por ahora.');
    expect(emptyResultLine({ filter: 'even', query: '' })).toBe('Ningún espacio está a mano todavía.');
    expect(emptyResultLine({ filter: 'all', query: 'zeta' })).toBe('Ningún espacio coincide con "zeta".');
  });
});
