import { describe, it, expect } from 'vitest';
import { formatPesos } from '@/lib/format';
import { filterMovements, type MovementRow } from '../buildMovementList';
import {
  canAddInMonth,
  canGoToNextMonth,
  effectiveFilter,
  filterSegments,
  groupRowsByDay,
  isFabHidden,
  monthHeadline,
  movementDoors,
  rowDestination,
  rowDetail,
} from '../movementsView';

/**
 * §16 · la lógica de Movimientos. TS puro.
 */

function row(overrides: Partial<MovementRow> & { id: string; date: string }): MovementRow {
  return {
    kind: 'personal-expense',
    label: 'cafe',
    amount: 4_500,
    total: null,
    context: null,
    category: 'gastronomia',
    spaceName: null,
    payerLabel: null,
    effect: null,
    effectKind: null,
    audience: { kind: 'private' },
    spaceId: null,
    note: null,
    deletable: true,
    reviewTag: null,
    formerSpace: false,
    ...overrides,
  };
}

const TODAY = '2026-10-15';

describe('groupRowsByDay · la lista agrupada por día', () => {
  const rows = [
    row({ id: 'a', date: '2026-10-15' }),
    row({ id: 'b', date: '2026-10-14' }),
    row({ id: 'c', date: '2026-10-14' }),
    row({ id: 'd', date: '2026-10-01' }),
  ];

  it('agrupa las filas del mismo día y respeta el orden en que vienen', () => {
    const groups = groupRowsByDay(rows, TODAY);

    expect(groups.map((group) => group.date)).toEqual(['2026-10-15', '2026-10-14', '2026-10-01']);
    expect(groups[1]!.rows.map((item) => item.id)).toEqual(['b', 'c']);
  });

  it('hoy lleva "Hoy · 15 oct"; los demás días, solo la fecha corta', () => {
    const groups = groupRowsByDay(rows, TODAY);

    expect(groups.map((group) => group.heading)).toEqual(['Hoy · 15 oct', '14 oct', '1 oct']);
  });

  it('sin filas no hay grupos', () => {
    expect(groupRowsByDay([], TODAY)).toEqual([]);
  });
});

describe('rowDestination · qué abre cada tipo de fila', () => {
  it('un movimiento personal abre su detalle', () => {
    expect(rowDestination(row({ id: 'movement:m1', date: TODAY }))).toEqual({
      kind: 'href',
      href: '/movimiento/m1',
    });
    expect(
      rowDestination(row({ id: 'movement:m2', date: TODAY, kind: 'personal-income' })),
    ).toEqual({ kind: 'href', href: '/movimiento/m2' });
  });

  it('un gasto compartido abre directo el detalle del gasto, no el espacio', () => {
    expect(
      rowDestination(
        row({ id: 'shared:g1', date: TODAY, kind: 'shared-expense', spaceId: 'casa' }),
      ),
    ).toEqual({ kind: 'href', href: '/space/casa/gasto/g1' });
  });

  it('un pago entre miembros abre lo que abría: el espacio', () => {
    expect(
      rowDestination(
        row({ id: 'payment:p1', date: TODAY, kind: 'member-payment', spaceId: 'casa' }),
      ),
    ).toEqual({ kind: 'space', spaceId: 'casa' });
  });

  it('SA-02 · de un espacio del que saliste no hay detalle, ni del gasto ni del pago', () => {
    expect(
      rowDestination(
        row({
          id: 'shared:g1',
          date: TODAY,
          kind: 'shared-expense',
          spaceId: 'casa',
          formerSpace: true,
        }),
      ),
    ).toBeNull();
    expect(
      rowDestination(
        row({
          id: 'payment:p1',
          date: TODAY,
          kind: 'member-payment',
          spaceId: 'casa',
          formerSpace: true,
        }),
      ),
    ).toBeNull();
  });
});

describe('monthHeadline · la frase del N1', () => {
  it('cuenta los registros, en singular y en plural', () => {
    expect(monthHeadline({ count: 12, month: '2026-10', today: TODAY })).toBe('12 registros');
    expect(monthHeadline({ count: 1, month: '2026-10', today: TODAY })).toBe('1 registro');
  });

  it('§16 · el mes en curso vacío: "Todavía no registraste nada en octubre."', () => {
    expect(monthHeadline({ count: 0, month: '2026-10', today: TODAY })).toBe(
      'Todavía no registraste nada en octubre.',
    );
  });

  it('un mes que ya pasó, vacío: "No registraste nada en agosto."', () => {
    expect(monthHeadline({ count: 0, month: '2026-08', today: TODAY })).toBe(
      'No registraste nada en agosto.',
    );
  });

  it('un mes de otro año lo dice', () => {
    expect(monthHeadline({ count: 0, month: '2025-12', today: TODAY })).toBe(
      'No registraste nada en diciembre de 2025.',
    );
  });
});

describe('meses: no se navega al futuro y no se agrega en el pasado', () => {
  it('la flecha siguiente se deshabilita en el mes en curso', () => {
    expect(canGoToNextMonth('2026-10', TODAY)).toBe(false);
    expect(canGoToNextMonth('2026-09', TODAY)).toBe(true);
    expect(canGoToNextMonth('2025-10', TODAY)).toBe(true);
  });

  it('solo se agrega en el mes en curso', () => {
    expect(canAddInMonth('2026-10', TODAY)).toBe(true);
    expect(canAddInMonth('2026-09', TODAY)).toBe(false);
  });

  it('el botón flotante se oculta en un mes pasado y en el mes en curso vacío (el N1 trae su Agregar)', () => {
    expect(isFabHidden({ month: '2026-09', today: TODAY, count: 17 })).toBe(true);
    expect(isFabHidden({ month: '2026-10', today: TODAY, count: 0 })).toBe(true);
    expect(isFabHidden({ month: '2026-10', today: TODAY, count: 12 })).toBe(false);
  });
});

describe('filterSegments · Todos · Personales · uno por espacio', () => {
  const casa = { id: 'casa', name: 'Casa' };
  const viaje = { id: 'viaje', name: 'Viaje' };

  it('sin espacios no hay nada que filtrar', () => {
    expect(filterSegments([])).toEqual([]);
  });

  it('con espacios: Todos, Personales y uno por espacio, en ese orden', () => {
    expect(filterSegments([casa, viaje])).toEqual([
      { key: 'all', label: 'Todos', kind: 'all' },
      { key: 'personal', label: 'Personales', kind: 'personal' },
      { key: 'casa', label: 'Casa', kind: 'space' },
      { key: 'viaje', label: 'Viaje', kind: 'space' },
    ]);
  });

  it('un filtro de un espacio que no aparece en este mes vuelve a Todos', () => {
    expect(effectiveFilter('casa', [casa])).toBe('casa');
    expect(effectiveFilter('viaje', [casa])).toBe('all');
    expect(effectiveFilter('personal', [casa])).toBe('personal');
    expect(effectiveFilter('shared', [casa])).toBe('shared');
    expect(effectiveFilter('casa', [])).toBe('all');
  });
});

describe('filterMovements · "shared" junta todos los espacios', () => {
  const rows = [
    row({ id: 'p', date: '2026-10-01' }),
    row({ id: 'c', date: '2026-10-02', spaceId: 'casa' }),
    row({ id: 'v', date: '2026-10-03', spaceId: 'viaje' }),
  ];

  it('deja lo de cualquier espacio y saca lo personal', () => {
    expect(filterMovements(rows, 'shared').map((item) => item.id)).toEqual(['c', 'v']);
  });
});

describe('rowDetail · la segunda línea, solo si agrega algo', () => {
  it('una fila personal simple no trae segunda línea', () => {
    expect(rowDetail(row({ id: 'a', date: TODAY }), { showSpace: true })).toEqual({
      caption: null,
      effect: null,
    });
  });

  it('un gasto compartido: "Casa · pagó vos" en Todos, "pagó vos" dentro de Casa', () => {
    const shared = row({
      id: 's',
      date: TODAY,
      kind: 'shared-expense',
      spaceId: 'casa',
      spaceName: 'Casa',
      payerLabel: 'pagó vos',
    });

    expect(rowDetail(shared, { showSpace: true }).caption).toBe('Casa · pagó vos');
    expect(rowDetail(shared, { showSpace: false }).caption).toBe('pagó vos');
  });

  it('un pago entre miembros: "no cambia tu radar" (§16)', () => {
    const payment = row({
      id: 'p',
      date: TODAY,
      kind: 'member-payment',
      category: null,
      spaceId: 'casa',
      spaceName: 'Casa',
      note: 'no cambia tu radar',
    });

    expect(rowDetail(payment, { showSpace: true }).caption).toBe('Casa · no cambia tu radar');
    expect(rowDetail(payment, { showSpace: false }).caption).toBe('no cambia tu radar');
  });

  it('un espacio del que saliste conserva su nombre aunque se filtre por él', () => {
    const former = row({
      id: 'f',
      date: TODAY,
      kind: 'shared-expense',
      spaceId: 'casa',
      spaceName: 'Casa · ya no sos miembro',
      payerLabel: 'pagó Martina',
      formerSpace: true,
    });

    expect(rowDetail(former, { showSpace: false }).caption).toBe(
      'Casa · ya no sos miembro · pagó Martina',
    );
  });

  it('el efecto sale con su tipo: cuotas, tarjeta e ingreso', () => {
    expect(
      rowDetail(row({ id: 'a', date: TODAY, effect: '6 cuotas de $30.000', effectKind: 'installments' }), {
        showSpace: true,
      }).effect,
    ).toEqual({ kind: 'installments', text: '6 cuotas de $30.000' });
    expect(
      rowDetail(row({ id: 'a', date: TODAY, effect: 'Se paga en noviembre', effectKind: 'card' }), {
        showSpace: true,
      }).effect,
    ).toEqual({ kind: 'card', text: 'Se paga en noviembre' });
    expect(
      rowDetail(row({ id: 'a', date: TODAY, effect: 'Ingreso registrado', effectKind: 'income' }), {
        showSpace: true,
      }).effect,
    ).toEqual({ kind: 'income', text: 'Ingreso registrado' });
  });

  it('el nombre de un medio de pago (efectivo, débito) no agrega nada: no se muestra', () => {
    expect(
      rowDetail(row({ id: 'a', date: TODAY, effect: 'Efectivo', effectKind: 'method' }), {
        showSpace: true,
      }).effect,
    ).toBeNull();
  });
});

describe('movementDoors · las puertas del N1', () => {
  const opts = {
    today: TODAY,
    rowLabel: (item: MovementRow) => item.label,
    formatAmount: formatPesos,
  };
  const casa = { id: 'casa', name: 'Casa' };
  const viaje = { id: 'viaje', name: 'Viaje' };

  const rows = [
    row({
      id: 's',
      date: '2026-10-15',
      label: 'Supermercado',
      kind: 'shared-expense',
      spaceId: 'casa',
      amount: 50_000,
      total: 100_000,
    }),
    row({ id: 'z', date: '2026-10-14', label: 'Zapatillas' }),
    row({
      id: 'i',
      date: '2026-10-12',
      label: 'Internet',
      kind: 'shared-expense',
      spaceId: 'casa',
      amount: 20_000,
      total: 40_000,
      reviewTag: 'Lo cargó Martina · para revisar',
    }),
    row({
      id: 'm',
      date: '2026-10-10',
      label: 'Martina te pagó',
      kind: 'member-payment',
      category: null,
      spaceId: 'casa',
      amount: 20_000,
    }),
    row({ id: 'c', date: '2026-10-09', label: 'Cafe' }),
  ];

  it('sin registros no hay puertas', () => {
    expect(movementDoors({ rows: [], spaces: [casa], ...opts })).toEqual([]);
  });

  it('sin espacios, una sola puerta: Todos', () => {
    const doors = movementDoors({ rows: rows.filter((item) => item.spaceId == null), spaces: [], ...opts });

    expect(doors.map((door) => door.title)).toEqual(['Todos']);
    expect(doors[0]!.caption).toBe('el último: Zapatillas, ayer');
  });

  it('con un espacio: Todos, Personales y el espacio', () => {
    const doors = movementDoors({ rows, spaces: [casa], ...opts });

    expect(doors.map((door) => door.title)).toEqual(['Todos', 'Personales', 'Casa']);
    expect(doors.map((door) => door.key)).toEqual(['all', 'personal', 'casa']);
    expect(doors[0]!.caption).toBe('el último: Supermercado, hoy');
    expect(doors[1]!.caption).toBe('2 · el último: Zapatillas, ayer');
  });

  it('la puerta del espacio dice TU PARTE (K9), sin sumar los pagos, y avisa lo que falta revisar', () => {
    const casaDoor = movementDoors({ rows, spaces: [casa], ...opts })[2]!;

    expect(casaDoor.caption).toBe('3 · tu parte $70.000');
    expect(casaDoor.extra).toBe('1 para revisar');
    expect(casaDoor.attention).toBe(true);
  });

  it('sin nada para revisar no hay aviso', () => {
    const clean = rows.map((item) => ({ ...item, reviewTag: null }));
    const casaDoor = movementDoors({ rows: clean, spaces: [casa], ...opts })[2]!;

    expect(casaDoor.extra).toBeNull();
    expect(casaDoor.attention).toBe(false);
  });

  it('con dos o más espacios, una sola puerta los resume', () => {
    const doors = movementDoors({ rows, spaces: [casa, viaje], ...opts });

    expect(doors.map((door) => door.title)).toEqual(['Todos', 'Personales', 'Espacios']);
    expect(doors[2]).toMatchObject({ key: 'shared', kind: 'spaces', caption: '3 · tu parte $70.000' });
  });

  it('no ofrece una puerta vacía: sin lo personal, no hay "Personales"', () => {
    const onlyShared = rows.filter((item) => item.spaceId != null);
    const doors = movementDoors({ rows: onlyShared, spaces: [casa], ...opts });

    expect(doors.map((door) => door.title)).toEqual(['Todos', 'Casa']);
  });
});
