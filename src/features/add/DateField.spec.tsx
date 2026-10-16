import { renderWithTheme, fireEvent } from '@/test/render';
import { PastDateField } from './DateField';

/**
 * Fecha mínima de carga · el día 1 del mes en curso. Los meses que ya pasaron
 * se ven completos pero no se les agrega nada: el selector no ofrece "Ayer" el
 * día 1 y el calendario no deja ir más atrás del día 1.
 */

const mockPicker = jest.fn((_props: unknown) => null);

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: unknown) => mockPicker(props),
}));

describe('PastDateField · fecha mínima', () => {
  beforeEach(() => mockPicker.mockClear());

  it('un día cualquiera ofrece Hoy, Ayer y Otra fecha', async () => {
    const view = await renderWithTheme(
      <PastDateField value="2026-10-15" onChange={() => {}} today="2026-10-15" />,
    );

    expect(view.getByRole('radio', { name: 'Hoy' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Ayer' })).toBeTruthy();
  });

  it('el día 1 se oculta "Ayer": caería en el mes anterior', async () => {
    const view = await renderWithTheme(
      <PastDateField value="2026-10-01" onChange={() => {}} today="2026-10-01" />,
    );

    expect(view.getByRole('radio', { name: 'Hoy' })).toBeTruthy();
    expect(view.queryByRole('radio', { name: 'Ayer' })).toBeNull();
    expect(view.getByRole('radio', { name: 'Otra fecha' })).toBeTruthy();
  });

  it('el calendario no deja ir antes del día 1 ni después de hoy', async () => {
    const view = await renderWithTheme(
      <PastDateField value="2026-10-15" onChange={() => {}} today="2026-10-15" />,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'Otra fecha' }));

    const props = mockPicker.mock.calls[0]![0] as { minimumDate: Date; maximumDate: Date };
    expect(props.minimumDate.getFullYear()).toBe(2026);
    expect(props.minimumDate.getMonth()).toBe(9);
    expect(props.minimumDate.getDate()).toBe(1);
    expect(props.maximumDate.getDate()).toBe(15);
  });

  it('elegir Ayer cambia la fecha un día atrás', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <PastDateField value="2026-10-15" onChange={onChange} today="2026-10-15" />,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'Ayer' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-14');
  });
});
