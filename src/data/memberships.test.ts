import { describe, it, expect } from 'vitest';
import { ownActiveMemberships } from './memberships';

/**
 * La RLS de space_members deja leer las DOS filas de cada espacio propio
 * (hace falta, para ver el nombre del otro miembro). El 10/10, cuando Martina
 * aceptó la invitación y su fila pasó a 'active', Casa apareció dos veces: en
 * la lista de espacios y, peor, en el radar de Renzo, que sumaba también la
 * parte de Martina (K9: al radar llega SOLO tu parte).
 */
const RENZO = 'renzo-id';
const MARTINA = 'martina-id';

describe('ownActiveMemberships', () => {
  it('el caso del 10/10: los dos activos en Casa → Renzo ve Casa UNA vez, con SU slot', () => {
    const visibleToRenzo = [
      { space_id: 'casa', slot: 1, user_id: RENZO, status: 'active' },
      { space_id: 'casa', slot: 2, user_id: MARTINA, status: 'active' },
    ];

    expect(ownActiveMemberships(visibleToRenzo, RENZO)).toEqual([{ spaceId: 'casa', slot: 1 }]);
    expect(ownActiveMemberships(visibleToRenzo, MARTINA)).toEqual([{ spaceId: 'casa', slot: 2 }]);
  });

  it('el lugar del otro sin acceso o ex miembro no cuenta', () => {
    const rows = [
      { space_id: 'casa', slot: 1, user_id: RENZO, status: 'active' },
      { space_id: 'casa', slot: 2, user_id: null, status: 'no_access' },
      { space_id: 'viaje', slot: 2, user_id: null, status: 'former' },
    ];
    expect(ownActiveMemberships(rows, RENZO)).toEqual([{ spaceId: 'casa', slot: 1 }]);
  });

  it('SA-02 · un espacio del que salí ya no es mío', () => {
    const rows = [{ space_id: 'casa', slot: 2, user_id: MARTINA, status: 'former' }];
    expect(ownActiveMemberships(rows, MARTINA)).toEqual([]);
  });

  it('varios espacios propios, cada uno una vez', () => {
    const rows = [
      { space_id: 'casa', slot: 1, user_id: RENZO, status: 'active' },
      { space_id: 'casa', slot: 2, user_id: MARTINA, status: 'active' },
      { space_id: 'viaje', slot: 1, user_id: RENZO, status: 'active' },
      { space_id: 'viaje', slot: 2, user_id: 'juan-id', status: 'active' },
    ];
    expect(ownActiveMemberships(rows, RENZO)).toEqual([
      { spaceId: 'casa', slot: 1 },
      { spaceId: 'viaje', slot: 1 },
    ]);
  });
});
