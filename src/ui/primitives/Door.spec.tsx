import { Text } from 'react-native';
import { CalendarRange } from 'lucide-react-native';
import { fireEvent, renderWithTheme } from '@/test/render';
import { Door } from './Door';

/** Nivel 3 · la puerta (N2): título, cifra, chevron, atención y toque. */
describe('Door', () => {
  it('título, cifra y su caption; toda la tarjeta se toca y lleva chevron', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <Door
        icon={CalendarRange}
        title="Octubre"
        value="$700.000"
        caption="entre los dos"
        onPress={onPress}
      />,
    );
    expect(view.getByText('Octubre')).toBeTruthy();
    expect(view.getByText(/\$700\.000/)).toBeTruthy();
    expect(view.getByText(/entre los dos/)).toBeTruthy();
    // El chevron es decorativo (oculto al lector de pantalla).
    expect(view.getByTestId('chevron', { includeHiddenElements: true })).toBeTruthy();

    await fireEvent.press(view.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sin cifra, el caption va solo', async () => {
    const view = await renderWithTheme(
      <Door icon={CalendarRange} title="Movimientos" caption="12 · último: Supermercado, hoy" onPress={jest.fn()} />,
    );
    expect(view.getByText('12 · último: Supermercado, hoy')).toBeTruthy();
  });

  it('una puerta común no lleva el punto de atención', async () => {
    const view = await renderWithTheme(
      <Door icon={CalendarRange} title="Movimientos" onPress={jest.fn()} />,
    );
    expect(view.queryByTestId('door-attention')).toBeNull();
  });

  it('con atención lleva el punto, y no se distingue solo por el color', async () => {
    const view = await renderWithTheme(
      <Door
        icon={CalendarRange}
        title="Pendientes"
        caption="2 para revisar · 1 sin completar"
        attention="attention"
        onPress={jest.fn()}
      />,
    );
    expect(view.getByTestId('door-attention')).toBeTruthy();
    expect(view.getByText('2 para revisar · 1 sin completar')).toBeTruthy();
  });

  it('N-08 · el aviso de exceso lleva borde ámbar y punto, sin rojo ni el acento de lo compartido', async () => {
    const view = await renderWithTheme(
      <Door
        icon={CalendarRange}
        title="Próximos meses"
        attention="excess"
        onPress={jest.fn()}
      />,
    );
    const style = Object.assign({}, ...[view.getByRole('button').props.style].flat(3).filter(Boolean));
    const dot = Object.assign(
      {},
      ...[view.getByTestId('door-attention').props.style].flat(3).filter(Boolean),
    );

    expect(style.borderColor).toBe('#8A5A00');
    expect(dot.backgroundColor).toBe('#8A5A00');
  });

  it('puede llevar algo a la derecha, antes del chevron (los avatares de un espacio)', async () => {
    const view = await renderWithTheme(
      <Door
        icon={CalendarRange}
        title="Casa"
        trailing={<Text>[avatares]</Text>}
        onPress={jest.fn()}
      />,
    );
    expect(view.getByText('[avatares]')).toBeTruthy();
  });

  it('3ii · en lugar del ícono puede llevar su propio dibujo (la balanza de un espacio)', async () => {
    const view = await renderWithTheme(
      <Door glyph={<Text>[balanza]</Text>} title="Casa" onPress={jest.fn()} />,
    );
    expect(view.getByText('[balanza]')).toBeTruthy();
  });

  it('3ii · puede llevar algo junto al título (la pastilla de pendientes)', async () => {
    const view = await renderWithTheme(
      <Door
        icon={CalendarRange}
        title="Casa"
        titleAside={<Text>[2 por revisar]</Text>}
        onPress={jest.fn()}
      />,
    );
    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.getByText('[2 por revisar]')).toBeTruthy();
  });

  it('3ii · una puerta punteada lleva el borde punteado, y la común no', async () => {
    const dashed = await renderWithTheme(
      <Door icon={CalendarRange} title="Gimnasio" dashed onPress={jest.fn()} />,
    );
    const plain = await renderWithTheme(
      <Door icon={CalendarRange} title="Casa" onPress={jest.fn()} />,
    );
    const styleOf = (view: typeof dashed) =>
      Object.assign({}, ...[view.getByRole('button').props.style].flat(3).filter(Boolean));

    expect(styleOf(dashed).borderStyle).toBe('dashed');
    expect(styleOf(plain).borderStyle).not.toBe('dashed');
  });

  it('el lector de pantalla lee el título y lo que dice, sin pedirle nada al ícono', async () => {
    const view = await renderWithTheme(
      <Door
        icon={CalendarRange}
        title="Pendientes"
        caption="1 fijo para decidir"
        attention="urgent"
        onPress={jest.fn()}
      />,
    );
    expect(view.getByLabelText('Pendientes. 1 fijo para decidir')).toBeTruthy();
  });
});
