import { fireEvent, renderWithTheme } from '@/test/render';
import type { MovementRow } from './buildMovementList';
import { FilterSegmented } from './FilterSegmented';
import { MovementDayList } from './MovementRowView';
import { MovementsHeader } from './MovementsHeader';
import { buildDayStrip, filterSegments, groupRowsByDay } from './movementsView';

/**
 * Nivel 3 · lo que dicen y hacen las piezas de Movimientos (§16): el N1, el
 * control segmentado y las filas.
 */

const TODAY = '2026-10-15';

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

describe('MovementsHeader · el N1', () => {
  const strip = buildDayStrip({
    month: '2026-10',
    today: TODAY,
    rows: [row({ id: 'a', date: '2026-10-14' })],
  });
  const base = {
    monthLabel: 'Octubre',
    headline: '1 registro',
    strip,
    onPrevious: jest.fn(),
    onNext: null,
    onAdd: null,
  };

  it('el mes, la frase y la tira de días con su texto para el lector de pantalla', async () => {
    const view = await renderWithTheme(<MovementsHeader {...base} />);

    expect(view.getByText('Octubre')).toBeTruthy();
    expect(view.getByText('1 registro')).toBeTruthy();
    expect(view.getByLabelText('Días con registros: 14')).toBeTruthy();
    expect(view.getByTestId('day-14-with')).toBeTruthy();
    expect(view.getByTestId('day-15-today')).toBeTruthy();
    expect(view.getByTestId('day-16-future')).toBeTruthy();
  });

  it('en el mes en curso la flecha siguiente está deshabilitada', async () => {
    const onPrevious = jest.fn();
    const view = await renderWithTheme(<MovementsHeader {...base} onPrevious={onPrevious} />);

    const next = view.getByRole('button', { name: 'Mes siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getByRole('button', { name: 'Mes anterior' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('en un mes que ya pasó la flecha siguiente funciona', async () => {
    const onNext = jest.fn();
    const view = await renderWithTheme(<MovementsHeader {...base} onNext={onNext} />);

    const next = view.getByRole('button', { name: 'Mes siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('§16 · el mes en curso vacío trae su Agregar adentro', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <MovementsHeader
        {...base}
        headline="Todavía no registraste nada en octubre."
        onAdd={onAdd}
      />,
    );

    expect(view.getByText('Todavía no registraste nada en octubre.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Agregar' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('un mes que ya pasó, vacío: sin botón Agregar', async () => {
    const view = await renderWithTheme(
      <MovementsHeader {...base} headline="No registraste nada en agosto." onNext={jest.fn()} />,
    );

    expect(view.getByText('No registraste nada en agosto.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Agregar' })).toBeNull();
  });
});

describe('FilterSegmented · Todos · Personales · uno por espacio', () => {
  const segments = filterSegments([{ id: 'casa', name: 'Casa' }]);

  it('sin espacios no se dibuja', async () => {
    const view = await renderWithTheme(
      <FilterSegmented segments={[]} value="all" onChange={jest.fn()} />,
    );

    expect(view.queryByRole('radio', { name: 'Todos' })).toBeNull();
  });

  it('marca el elegido y cambia al tocar otro', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <FilterSegmented segments={segments} value="all" onChange={onChange} />,
    );

    expect(view.getByRole('radio', { name: 'Todos' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole('radio', { name: 'Casa' }).props.accessibilityState.selected).toBe(false);

    await fireEvent.press(view.getByRole('radio', { name: 'Casa' }));
    expect(onChange).toHaveBeenCalledWith('casa');
  });
});

describe('MovementDayList · la lista agrupada por día', () => {
  const rows = [
    row({
      id: 'shared:1',
      date: TODAY,
      label: 'Supermercado',
      kind: 'shared-expense',
      category: 'supermercado',
      amount: 50_000,
      total: 100_000,
      spaceId: 'casa',
      spaceName: 'Casa',
      payerLabel: 'pagó vos',
      audience: { kind: 'shared', otherMemberName: 'Martina' },
    }),
    row({
      id: 'movement:2',
      date: '2026-10-14',
      label: 'Zapatillas',
      category: 'ropa',
      amount: 180_000,
      effect: '6 cuotas de $30.000',
      effectKind: 'installments',
    }),
    row({
      id: 'payment:3',
      date: '2026-10-10',
      label: 'Martina te pagó',
      kind: 'member-payment',
      category: null,
      amount: 20_000,
      spaceId: 'casa',
      spaceName: 'Casa',
      note: 'no cambia tu radar',
      audience: { kind: 'shared', otherMemberName: 'Martina' },
    }),
    row({ id: 'movement:4', date: '2026-10-09', label: 'cafe' }),
  ];
  const groups = groupRowsByDay(rows, TODAY);

  it('un encabezado por día, con "Hoy · 15 oct"', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
    );

    expect(view.getByText('Hoy · 15 oct')).toBeTruthy();
    expect(view.getByText('14 oct')).toBeTruthy();
    expect(view.getByText('10 oct')).toBeTruthy();
  });

  it('K9 · de un compartido, tu parte arriba y el total en gris', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
    );

    expect(view.getByText('$50.000')).toBeTruthy();
    expect(view.getByText('de $100.000')).toBeTruthy();
    expect(view.getByText('Casa · pagó vos')).toBeTruthy();
  });

  it('dentro de un espacio el nombre sobra', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace={false} onOpen={jest.fn()} />,
    );

    expect(view.getByText('pagó vos')).toBeTruthy();
    expect(view.queryByText('Casa · pagó vos')).toBeNull();
  });

  it('la segunda línea, solo si agrega algo: el efecto y "no cambia tu radar"', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
    );

    expect(view.getByText('6 cuotas de $30.000')).toBeTruthy();
    expect(view.getByText('Casa · no cambia tu radar')).toBeTruthy();
  });

  it('abre la fila que se toca', async () => {
    const onOpen = jest.fn();
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={onOpen} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Zapatillas' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'movement:2' }));
  });

  it('SA-02 · un espacio del que saliste no tiene detalle: la fila no es un botón', async () => {
    const former = groupRowsByDay(
      [row({ id: 'shared:9', date: TODAY, label: 'Cena', formerSpace: true, spaceId: 'casa' })],
      TODAY,
    );
    const view = await renderWithTheme(
      <MovementDayList groups={former} showSpace onOpen={jest.fn()} />,
    );

    expect(view.queryByRole('button', { name: 'Cena' })).toBeNull();
    expect(view.getByText('Cena')).toBeTruthy();
  });
});
