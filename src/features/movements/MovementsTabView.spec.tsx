import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderWithTheme, waitFor } from '@/test/render';
import type { MovementFilter, MovementRow } from './buildMovementList';
import { MovementsTabView } from './MovementsTabView';
import { filterSegments } from './movementsView';

/**
 * §16 · la pestaña Movimientos (16A) entera: tocar un día cambia la lista de
 * abajo SIN navegar, "Todo el mes" se prende y se apaga, los futuros no
 * responden, las flechas se frenan en la semana de hoy, el filtro filtra la
 * misma lista y las cifras de arriba no se mueven.
 */

// Domingo 18 de octubre de 2026: el dibujo del usuario.
const TODAY = '2026-10-18';

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
    paymentDirection: null,
    ...overrides,
  };
}

const casaRow = (overrides: Partial<MovementRow> & { id: string; date: string }) =>
  row({
    kind: 'shared-expense',
    spaceId: 'casa',
    spaceName: 'Casa',
    payerLabel: 'pagó vos',
    audience: { kind: 'shared', otherMemberName: 'Martina' },
    ...overrides,
  });

const ROWS: MovementRow[] = [
  casaRow({ id: 'shared:1', date: '2026-10-18', label: 'Supermercado', amount: 50_000, total: 100_000 }),
  row({ id: 'movement:2', date: '2026-10-18', label: 'Cafe' }),
  row({ id: 'movement:3', date: '2026-10-17', label: 'Kiosco' }),
  casaRow({ id: 'shared:4', date: '2026-10-14', label: 'Luz', amount: 22_500, total: 45_000, reviewTag: 'Lo cargó Martina · para revisar' }),
  row({ id: 'movement:5', date: '2026-10-14', label: 'Zapatillas', amount: 180_000 }),
  row({ id: 'movement:6', date: '2026-10-10', label: 'Farmacia', amount: 9_600 }),
  row({ id: 'movement:7', date: '2026-10-02', label: 'Subte' }),
];

const SEPTEMBER: MovementRow[] = [
  row({ id: 'movement:s1', date: '2026-09-26', label: 'Libreria' }),
  row({ id: 'movement:s2', date: '2026-09-23', label: 'Taxi' }),
  row({ id: 'movement:s3', date: '2026-09-23', label: 'Peaje' }),
];

type Props = Partial<Parameters<typeof MovementsTabView>[0]>;

/** El filtro vive en el container: acá lo hace un wrapper mínimo. */
function Harness(props: Props & { onOpenRow?: (row: MovementRow) => void }) {
  const [filter, setFilter] = useState<MovementFilter>('all');
  return (
    <MovementsTabView
      month="2026-10"
      monthLabel="Octubre"
      today={TODAY}
      rows={ROWS}
      segments={filterSegments([{ id: 'casa', name: 'Casa' }])}
      filter={filter}
      isLoading={false}
      onFilterChange={setFilter}
      onPreviousMonth={jest.fn()}
      onNextMonth={null}
      onOpenRow={jest.fn()}
      {...props}
    />
  );
}

async function setup(props: Props = {}) {
  const view = await renderWithTheme(<Harness {...props} />);
  return view;
}

describe('MovementsTabView · la pestaña, de arriba abajo', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('arriba: hoy, las dos cifras y la lista de hoy ya abierta', async () => {
    const view = await setup();

    expect(view.getByText('Hoy, domingo 18 de octubre')).toBeTruthy();
    expect(view.getByLabelText('2 registros hoy')).toBeTruthy();
    expect(view.getByLabelText('7 en octubre')).toBeTruthy();
    expect(view.getByText('Hoy, domingo 18 · 2 registros')).toBeTruthy();
    expect(view.getByText('Supermercado')).toBeTruthy();
    expect(view.getByText('Cafe')).toBeTruthy();
    expect(view.queryByText('Kiosco')).toBeNull();
  });

  it('no hay puertas ni "Agregar" adentro: el botón flotante es de la pestaña', async () => {
    const view = await setup();

    expect(view.queryByRole('button', { name: 'Agregar' })).toBeNull();
    expect(view.queryByText('Espacios')).toBeNull();
  });

  it('K10 · la línea "1 para revisar en Casa" está en el N1', async () => {
    const view = await setup();

    expect(view.getByText('1 para revisar en Casa')).toBeTruthy();
  });

  it('tocar un día cambia la lista de abajo, sin navegar', async () => {
    const onOpenRow = jest.fn();
    const view = await setup({ onOpenRow });

    await fireEvent.press(view.getByRole('button', { name: /^Miércoles 14 de octubre/ }));

    expect(view.getByText('Miércoles 14 · 2 registros')).toBeTruthy();
    expect(view.getByText('Luz')).toBeTruthy();
    expect(view.getByText('Zapatillas')).toBeTruthy();
    expect(view.queryByText('Supermercado')).toBeNull();
    // Cambiar de día no abre ninguna fila.
    expect(onOpenRow).not.toHaveBeenCalled();
  });

  it('las cifras de arriba no cambian al elegir un día ni un filtro', async () => {
    const view = await setup();

    await fireEvent.press(view.getByRole('button', { name: /^Miércoles 14 de octubre/ }));
    await fireEvent.press(view.getByRole('radio', { name: 'Personales' }));

    expect(view.getByText('Hoy, domingo 18 de octubre')).toBeTruthy();
    expect(view.getByLabelText('2 registros hoy')).toBeTruthy();
    expect(view.getByLabelText('7 en octubre')).toBeTruthy();
    expect(view.getByText('1 para revisar en Casa')).toBeTruthy();
  });

  it('un día sin registros: "No registraste nada el 9 de octubre." en lugar de la lista', async () => {
    const view = await setup();

    // La franja arranca en la semana de hoy: el 9 queda una semana atrás.
    await fireEvent.press(view.getByRole('button', { name: 'Semana anterior' }));
    await fireEvent.press(view.getByRole('button', { name: 'Viernes 9 de octubre, sin registros' }));

    expect(view.getByText('No registraste nada el 9 de octubre.')).toBeTruthy();
    expect(view.getByText('Viernes 9')).toBeTruthy();
    expect(view.queryByText('Farmacia')).toBeNull();
  });

  it('"Todo el mes" se prende: la lista del mes agrupada por día, y se apaga con el mismo toque', async () => {
    const view = await setup();

    const toggle = view.getByRole('switch', { name: 'Todo el mes' });
    await fireEvent.press(toggle);

    expect(view.getByText('Todo octubre · 7 registros')).toBeTruthy();
    expect(view.getByText('Hoy · 18 oct')).toBeTruthy();
    expect(view.getByText('14 oct')).toBeTruthy();
    expect(view.getByText('Subte')).toBeTruthy();
    expect(view.getByRole('switch', { name: 'Todo el mes' }).props.accessibilityState.checked).toBe(true);

    await fireEvent.press(view.getByRole('switch', { name: 'Todo el mes' }));

    expect(view.getByText('Hoy, domingo 18 · 2 registros')).toBeTruthy();
    expect(view.queryByText('Subte')).toBeNull();
    expect(view.getByRole('switch', { name: 'Todo el mes' }).props.accessibilityState.checked).toBe(false);
  });

  it('tocar un día con "Todo el mes" prendido lo apaga y vuelve a ese día', async () => {
    const view = await setup();

    await fireEvent.press(view.getByRole('switch', { name: 'Todo el mes' }));
    await fireEvent.press(view.getByRole('button', { name: /^Sábado 17 de octubre/ }));

    expect(view.getByText('Sábado 17 · 1 registro')).toBeTruthy();
    expect(view.getByRole('switch', { name: 'Todo el mes' }).props.accessibilityState.checked).toBe(false);
  });

  it('los días futuros no responden', async () => {
    // Jueves 15: la semana de hoy tiene el 16, 17 y 18 por delante.
    const view = await setup({ today: '2026-10-15', rows: ROWS.filter((item) => item.date <= '2026-10-15') });
    expect(view.getByText('Hoy, jueves 15')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Viernes 16 de octubre, todavía no llegó'));

    // La lista sigue en hoy: un día que no llegó no se elige.
    expect(view.getByText('Hoy, jueves 15')).toBeTruthy();
    expect(view.queryByText('Viernes 16')).toBeNull();
  });

  it('las flechas se frenan en la semana de hoy', async () => {
    const view = await setup();

    expect(view.getByText('12 al 18 de octubre')).toBeTruthy();
    const next = view.getByRole('button', { name: 'Semana siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(next);
    expect(view.getByText('12 al 18 de octubre')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Semana anterior' }));
    expect(view.getByText('5 al 11 de octubre')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Semana anterior' }));
    expect(view.getByText('1 al 4 de octubre')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Semana anterior' }).props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getByRole('button', { name: 'Semana siguiente' }));
    expect(view.getByText('5 al 11 de octubre')).toBeTruthy();
  });

  it('el filtro filtra la misma lista, y la franja deja de prometer lo que no está', async () => {
    const view = await setup();

    await fireEvent.press(view.getByRole('switch', { name: 'Todo el mes' }));
    await fireEvent.press(view.getByRole('radio', { name: 'Personales' }));

    expect(view.getByText('Todo octubre · 5 registros')).toBeTruthy();
    expect(view.queryByText('Supermercado')).toBeNull();
    expect(view.queryByText('Luz')).toBeNull();
    expect(view.getByText('Zapatillas')).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: 'Casa' }));
    expect(view.getByText('Todo octubre · 2 registros')).toBeTruthy();
    expect(view.queryByText('Zapatillas')).toBeNull();
  });

  it('los filtros se ven como filtros: uno elegido, sin chevron de puerta', async () => {
    const view = await setup();

    expect(view.getByRole('radio', { name: 'Todos' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole('radio', { name: 'Personales' }).props.accessibilityState.selected).toBe(false);
  });

  it('con dos o más espacios, un chip por espacio', async () => {
    const view = await setup({
      segments: filterSegments([
        { id: 'casa', name: 'Casa' },
        { id: 'viaje', name: 'Viaje' },
      ]),
    });

    expect(view.getByRole('radio', { name: 'Casa' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Viaje' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Todos' }).props.accessibilityState.selected).toBe(true);
  });

  it('tocar una fila abre su detalle', async () => {
    const onOpenRow = jest.fn();
    const view = await setup({ onOpenRow });

    await fireEvent.press(view.getByRole('button', { name: /^Cafe/ }));
    expect(onOpenRow).toHaveBeenCalledWith(expect.objectContaining({ id: 'movement:2' }));
  });

  it('se conserva: "tu parte" como cifra, el total en gris y el ícono de la fila de un compartido', async () => {
    const view = await setup();

    expect(view.getByText('−$50.000')).toBeTruthy();
    expect(view.getByText('de $100.000')).toBeTruthy();
    expect(view.getByText('Casa · pagó vos')).toBeTruthy();
  });

  it('un mes sin registros dice que no registraste nada y no se rompe', async () => {
    const view = await setup({ rows: [] });

    expect(view.getByLabelText('0 registros hoy')).toBeTruthy();
    expect(view.getByText('Todavía no registraste nada hoy.')).toBeTruthy();
  });

  it('CA-00 · plata solo en las filas: el N1, la franja y el encabezado no suman ninguna cifra', async () => {
    const view = await setup();

    // Hoy hay dos filas: "−$50.000" con su "de $100.000", y "−$4.500". Nada más.
    expect(view.getAllByText(/\$/).map((node) => node.props.children)).toEqual([
      '−$50.000',
      ['de ', '$100.000'],
      '−$4.500',
    ]);
  });
});

describe('MovementsTabView · un mes pasado', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const past = {
    month: '2026-09',
    monthLabel: 'Septiembre',
    rows: SEPTEMBER,
    onNextMonth: jest.fn(),
    segments: [],
  };

  it('arranca en "Todo el mes": sin "Hoy" y con las cifras del mes', async () => {
    const view = await setup(past);

    expect(view.getAllByText('Septiembre')).toHaveLength(1);
    expect(view.queryByText(/Hoy/)).toBeNull();
    expect(view.getByLabelText('3 registros en septiembre')).toBeTruthy();
    expect(view.getByLabelText('2 días con registros')).toBeTruthy();
    expect(view.getByText('Todo septiembre · 3 registros')).toBeTruthy();
    expect(view.getByText('26 sep')).toBeTruthy();
    expect(view.getByRole('switch', { name: 'Todo el mes' }).props.accessibilityState.checked).toBe(true);
  });

  it('se puede elegir un día de un mes pasado', async () => {
    const view = await setup(past);

    // La franja arranca en la última semana del mes (28 al 30): el 23 está una atrás.
    await fireEvent.press(view.getByRole('button', { name: 'Semana anterior' }));
    await fireEvent.press(
      view.getByRole('button', { name: 'Miércoles 23 de septiembre, 2 registros' }),
    );

    expect(view.getByText('Miércoles 23 · 2 registros')).toBeTruthy();
    expect(view.getByRole('switch', { name: 'Todo el mes' }).props.accessibilityState.checked).toBe(false);
  });

  it('sin filtros cuando no hay espacios', async () => {
    const view = await setup(past);

    expect(view.queryByRole('radio')).toBeNull();
  });

  it('?dia= abre ya en ese día', async () => {
    const view = await renderWithTheme(
      <Harness {...past} initialDay="2026-09-26" />,
    );

    expect(view.getByText('Sábado 26 · 1 registro')).toBeTruthy();
    expect(view.getByText('Libreria')).toBeTruthy();
  });
});

describe('MovementsTabView · la ayuda del punto', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const HELP = 'El punto debajo de un día indica que registraste algo ese día.';

  it('aparece la primera vez, junto a la franja, y la leyenda queda aparte', async () => {
    const view = await setup();

    await waitFor(() => expect(view.getByText(HELP)).toBeTruthy());
    expect(view.getByText('días con registros')).toBeTruthy();
  });

  it('una sola vez: "Entendido" la cierra y la leyenda permanece', async () => {
    const first = await setup();
    await waitFor(() => expect(first.getByText(HELP)).toBeTruthy());
    await fireEvent.press(first.getByRole('button', { name: 'Entendido' }));
    expect(first.queryByText(HELP)).toBeNull();
    expect(first.getByText('días con registros')).toBeTruthy();
    await first.unmount();

    const second = await setup();
    await waitFor(async () => expect(await AsyncStorage.getItem('radar.movements.dotHelp')).toBe('1'));
    await waitFor(() => expect(second.queryByText(HELP)).toBeNull());
    expect(second.getByText('días con registros')).toBeTruthy();
  });
});
