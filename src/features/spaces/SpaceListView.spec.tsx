import { fireEvent, renderWithTheme } from '@/test/render';
import { SpaceListView } from './SpaceListView';
import type { SpaceRowModel } from './spaceRow';

/**
 * Nivel 3 · 3ii · la lista de Compartidos cuando crece: el filtro desde 5
 * espacios, la búsqueda desde 9, "Mostrando N de M" y el orden por reciente.
 */

function row(
  id: string,
  overrides: { name?: string; other?: string; pending?: number; balance?: number; opened?: number | null } = {},
): SpaceRowModel {
  const name = overrides.name ?? id;
  const other = overrides.other ?? 'Martina';
  const balance = overrides.balance ?? 0;
  const pending = overrides.pending ?? 0;
  return {
    id,
    name,
    myName: 'Renzo',
    otherName: other,
    otherDashed: false,
    former: false,
    glyph: { direction: balance === 0 ? 0 : -1, showCheck: balance === 0, label: `Balanza de ${name}` },
    sentence: balance === 0 ? 'Están a mano' : `${other} te debe $${balance}`,
    settled: balance === 0,
    pill: pending > 0 ? `${pending} por revisar` : null,
    note: null,
    loading: false,
    accessibilityLabel: `${name}. ${balance === 0 ? 'Están a mano' : 'te debe'}`,
    item: {
      id,
      name,
      otherName: other,
      ready: true,
      pending,
      balance,
      lastOpenedAt: overrides.opened ?? null,
    },
  };
}

const three = [row('Casa', { balance: 20_000 }), row('Auto', { other: 'Lucas' }), row('Viaje')];

const six = [
  row('Casa', { balance: 20_000, pending: 2, opened: 6 }),
  row('Auto', { other: 'Lucas', balance: 4_200, opened: 5 }),
  row('Familia', { other: 'Paula', opened: 4 }),
  row('Mudanza', { other: 'Sofía', balance: 8_500, pending: 1, opened: 3 }),
  row('Viaje', { other: 'Juan', opened: 2 }),
  row('Oficina', { other: 'Ana', opened: 1 }),
];

const nine = [
  ...six,
  row('Club', { other: 'Diego' }),
  row('Asado', { other: 'Valeria' }),
  row('Café', { other: 'Lola' }),
];

describe('SpaceListView', () => {
  it('con pocos espacios, solo las filas: ni filtro ni búsqueda', async () => {
    const view = await renderWithTheme(<SpaceListView rows={three} onOpen={jest.fn()} />);

    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.queryByLabelText('Mostrar')).toBeNull();
    expect(view.queryByLabelText('Buscar por espacio o persona')).toBeNull();
  });

  it('desde 5 espacios aparece el filtro, con "Todos" elegido', async () => {
    const view = await renderWithTheme(<SpaceListView rows={six} onOpen={jest.fn()} />);

    expect(view.getByLabelText('Mostrar')).toBeTruthy();
    expect(view.getByLabelText('Todos').props.accessibilityState).toMatchObject({ selected: true });
    expect(view.queryByLabelText('Buscar por espacio o persona')).toBeNull();
    // Sin filtro aplicado no hay línea de "Mostrando".
    expect(view.queryByText(/Mostrando/)).toBeNull();
  });

  it('"Para mirar" deja los que tienen algo por revisar o saldo, y dice cuántos de cuántos', async () => {
    const view = await renderWithTheme(<SpaceListView rows={six} onOpen={jest.fn()} />);

    await fireEvent.press(view.getByLabelText('Para mirar'));

    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.getByText('Auto')).toBeTruthy();
    expect(view.getByText('Mudanza')).toBeTruthy();
    expect(view.queryByText('Familia')).toBeNull();
    expect(view.queryByText('Viaje')).toBeNull();
    expect(view.getByText('Mostrando 3 de 6 espacios')).toBeTruthy();
  });

  it('"A mano" deja el resto', async () => {
    const view = await renderWithTheme(<SpaceListView rows={six} onOpen={jest.fn()} />);

    await fireEvent.press(view.getByLabelText('A mano'));

    expect(view.getByText('Familia')).toBeTruthy();
    expect(view.getByText('Viaje')).toBeTruthy();
    expect(view.getByText('Oficina')).toBeTruthy();
    expect(view.queryByText('Casa')).toBeNull();
    expect(view.getByText('Mostrando 3 de 6 espacios')).toBeTruthy();
  });

  it('volver a "Todos" muestra todo y saca la línea', async () => {
    const view = await renderWithTheme(<SpaceListView rows={six} onOpen={jest.fn()} />);

    await fireEvent.press(view.getByLabelText('A mano'));
    await fireEvent.press(view.getByLabelText('Todos'));

    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.queryByText(/Mostrando/)).toBeNull();
  });

  it('desde 9 espacios aparece la búsqueda por nombre del espacio o de la persona', async () => {
    const view = await renderWithTheme(<SpaceListView rows={nine} onOpen={jest.fn()} />);

    const search = view.getByLabelText('Buscar por espacio o persona');
    await fireEvent.changeText(search, 'sofia');

    expect(view.getByText('Mudanza')).toBeTruthy();
    expect(view.queryByText('Casa')).toBeNull();
    expect(view.getByText('Mostrando 1 de 9 espacios')).toBeTruthy();
  });

  it('una búsqueda sin resultados lo dice', async () => {
    const view = await renderWithTheme(<SpaceListView rows={nine} onOpen={jest.fn()} />);

    await fireEvent.changeText(view.getByLabelText('Buscar por espacio o persona'), 'zzz');

    expect(view.getByText('Ningún espacio coincide con "zzz".')).toBeTruthy();
  });

  it('el orden por defecto es del abierto más recientemente al menos reciente', async () => {
    const view = await renderWithTheme(
      <SpaceListView
        rows={[row('Viejo', { opened: 1 }), row('Nuevo', { opened: 9 }), row('Medio', { opened: 5 })]}
        onOpen={jest.fn()}
      />,
    );

    const names = view
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel as string)
      .map((label) => label.split('.')[0]);
    expect(names).toEqual(['Nuevo', 'Medio', 'Viejo']);
  });

  it('tocar una fila abre ese espacio', async () => {
    const onOpen = jest.fn();
    const view = await renderWithTheme(<SpaceListView rows={three} onOpen={onOpen} />);

    await fireEvent.press(view.getByLabelText(/^Auto\./));
    expect(onOpen).toHaveBeenCalledWith('Auto');
  });

  it('CA-00 · sin cifras sumadas entre espacios ni términos prohibidos', async () => {
    const view = await renderWithTheme(<SpaceListView rows={six} onOpen={jest.fn()} />);

    for (const forbidden of [/disponible/i, /te qued/i, /\blibre\b/i, /pagado/i, /total/i]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });
});
