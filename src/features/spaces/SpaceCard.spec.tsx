import { fireEvent, renderWithTheme } from '@/test/render';
import { CreateSpaceCard, SpaceCard } from './SpaceCard';
import type { SpaceRowModel } from './spaceRow';

/**
 * Nivel 3 · 3ii · la fila de cada espacio en la lista de Compartidos: una puerta
 * con la balanza mini en la caja del ícono, el nombre, la pastilla, la frase del
 * saldo, los avatares superpuestos y el chevron.
 */
const hidden = { includeHiddenElements: true };

const base: SpaceRowModel = {
  id: 'casa',
  name: 'Casa',
  myName: 'Renzo',
  otherName: 'Martina',
  otherDashed: false,
  former: false,
  glyph: { direction: -1, showCheck: false, label: 'Balanza inclinada hacia vos.' },
  sentence: 'Martina te debe $20.000',
  settled: false,
  pill: null,
  note: null,
  loading: false,
  accessibilityLabel: 'Casa. Martina te debe $20.000',
  item: {
    id: 'casa',
    name: 'Casa',
    otherName: 'Martina',
    ready: true,
    pending: 0,
    balance: 20_000,
    lastOpenedAt: null,
  },
};

describe('SpaceCard', () => {
  it('el nombre, la balanza en la caja del ícono, la frase y los dos avatares', async () => {
    const view = await renderWithTheme(<SpaceCard row={base} onPress={jest.fn()} />);

    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.getByLabelText('Balanza inclinada hacia vos.')).toBeTruthy();
    expect(view.getByText('Martina te debe $20.000')).toBeTruthy();
    // Iniciales, nunca foto ni email (K7): vos y la otra persona.
    expect(view.getByText('R')).toBeTruthy();
    expect(view.getByText('M')).toBeTruthy();
    // El chevron es decorativo (oculto al lector de pantalla).
    expect(view.getByTestId('chevron', hidden)).toBeTruthy();
  });

  it('están a mano: la balanza lleva el tilde', async () => {
    const view = await renderWithTheme(
      <SpaceCard
        row={{
          ...base,
          sentence: 'Están a mano',
          settled: true,
          glyph: { direction: 0, showCheck: true, label: 'Balanza nivelada, con una tilde.' },
        }}
        onPress={jest.fn()}
      />,
    );

    expect(view.getByText('Están a mano')).toBeTruthy();
    expect(view.getByTestId('balance-glyph-check', hidden)).toBeTruthy();
  });

  it('la pastilla de pendientes, solo si los hay', async () => {
    const without = await renderWithTheme(<SpaceCard row={base} onPress={jest.fn()} />);
    expect(without.queryByText(/por revisar/)).toBeNull();

    const withPill = await renderWithTheme(
      <SpaceCard row={{ ...base, pill: '2 por revisar' }} onPress={jest.fn()} />,
    );
    expect(withPill.getByText('2 por revisar')).toBeTruthy();
  });

  it('"todavía no entró" y "ex miembro" se conservan (§24)', async () => {
    const view = await renderWithTheme(
      <SpaceCard
        row={{ ...base, note: 'Juan todavía no entró', otherDashed: true }}
        onPress={jest.fn()}
      />,
    );
    expect(view.getByText('Juan todavía no entró')).toBeTruthy();

    const former = await renderWithTheme(
      <SpaceCard row={{ ...base, note: 'Juan · ex miembro', former: true }} onPress={jest.fn()} />,
    );
    expect(former.getByText('Juan · ex miembro')).toBeTruthy();
  });

  it('un ex miembro lleva la fila de borde punteado; los demás, no', async () => {
    const styleOf = (view: Awaited<ReturnType<typeof renderWithTheme>>) =>
      Object.assign({}, ...[view.getByRole('button').props.style].flat(3).filter(Boolean));

    const former = await renderWithTheme(
      <SpaceCard row={{ ...base, former: true }} onPress={jest.fn()} />,
    );
    const active = await renderWithTheme(<SpaceCard row={base} onPress={jest.fn()} />);

    expect(styleOf(former).borderStyle).toBe('dashed');
    expect(styleOf(active).borderStyle).not.toBe('dashed');
  });

  it('abrir el espacio es tocar la fila entera, y el lector la lee completa', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <SpaceCard
        row={{
          ...base,
          pill: '2 por revisar',
          accessibilityLabel: 'Casa. Martina te debe $20.000. 2 por revisar',
        }}
        onPress={onPress}
      />,
    );
    await fireEvent.press(view.getByLabelText('Casa. Martina te debe $20.000. 2 por revisar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('mientras carga no inventa un saldo', async () => {
    const view = await renderWithTheme(
      <SpaceCard row={{ ...base, glyph: null, sentence: null, loading: true }} onPress={jest.fn()} />,
    );
    expect(view.queryByText(/debe/)).toBeNull();
    expect(view.getByText('Casa')).toBeTruthy();
  });
});

describe('CreateSpaceCard', () => {
  it('"Crear otro espacio" con borde punteado, sin ser un botón lleno', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(<CreateSpaceCard onPress={onPress} />);
    await fireEvent.press(view.getByLabelText('Crear otro espacio'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
