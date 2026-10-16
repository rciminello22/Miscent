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
