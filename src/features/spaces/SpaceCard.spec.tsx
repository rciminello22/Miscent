import { Text } from 'react-native';
import { fireEvent, renderWithTheme } from '@/test/render';
import { CreateSpaceCard, SpaceCard } from './SpaceCard';

/** Nivel 3 · P23 · la tarjeta de cada espacio en la lista de Compartidos. */
const base = {
  name: 'Casa',
  scale: <Text>[balanza mini]</Text>,
  sentence: 'Martina te debe $20.000',
  settled: false,
  pill: null,
  note: null,
  onPress: jest.fn(),
};

describe('SpaceCard', () => {
  it('el nombre, la balanza mini y la frase del saldo', async () => {
    const view = await renderWithTheme(<SpaceCard {...base} />);
    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.getByText('[balanza mini]')).toBeTruthy();
    expect(view.getByText('Martina te debe $20.000')).toBeTruthy();
    // El chevron es decorativo (oculto al lector de pantalla).
    expect(view.getByTestId('chevron', { includeHiddenElements: true })).toBeTruthy();
  });

  it('la pastilla de pendientes, solo si los hay', async () => {
    const without = await renderWithTheme(<SpaceCard {...base} />);
    expect(without.queryByText(/por revisar/)).toBeNull();

    const withPill = await renderWithTheme(<SpaceCard {...base} pill="2 por revisar" />);
    expect(withPill.getByText('2 por revisar')).toBeTruthy();
  });

  it('"todavía no entró" y "ex miembro" se conservan (§24)', async () => {
    const view = await renderWithTheme(<SpaceCard {...base} note="Juan todavía no entró" />);
    expect(view.getByText('Juan todavía no entró')).toBeTruthy();

    const former = await renderWithTheme(<SpaceCard {...base} note="Juan · ex miembro" />);
    expect(former.getByText('Juan · ex miembro')).toBeTruthy();
  });

  it('abrir el espacio es tocar la tarjeta entera, y el lector la lee completa', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <SpaceCard {...base} pill="2 por revisar" onPress={onPress} />,
    );
    await fireEvent.press(
      view.getByLabelText('Casa. Martina te debe $20.000. 2 por revisar'),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('mientras carga no inventa un saldo', async () => {
    const view = await renderWithTheme(<SpaceCard {...base} scale={null} sentence={null} loading />);
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
