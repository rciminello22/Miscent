import { fireEvent, renderWithTheme } from '@/test/render';
import { Segmented } from './Segmented';

/** Nivel 3 · el control segmentado: uno elegido, y se distingue por más que el color. */
const options = [
  { key: 'all', label: 'Todos' },
  { key: 'watch', label: 'Para mirar' },
  { key: 'even', label: 'A mano' },
] as const;

describe('Segmented', () => {
  it('muestra las opciones y marca la elegida como seleccionada', async () => {
    const view = await renderWithTheme(
      <Segmented label="Mostrar" options={options} value="watch" onChange={jest.fn()} />,
    );

    expect(view.getByText('Todos')).toBeTruthy();
    expect(view.getByText('Para mirar')).toBeTruthy();
    expect(view.getByText('A mano')).toBeTruthy();
    expect(view.getByLabelText('Para mirar').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(view.getByLabelText('Todos').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('tocar otra opción avisa cuál', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <Segmented label="Mostrar" options={options} value="all" onChange={onChange} />,
    );

    await fireEvent.press(view.getByLabelText('A mano'));
    expect(onChange).toHaveBeenCalledWith('even');
  });

  it('es un grupo de opciones para el lector de pantalla', async () => {
    const view = await renderWithTheme(
      <Segmented label="Mostrar" options={options} value="all" onChange={jest.fn()} />,
    );

    expect(view.getByLabelText('Mostrar').props.accessibilityRole).toBe('radiogroup');
    expect(view.getAllByRole('radio')).toHaveLength(3);
  });
});
