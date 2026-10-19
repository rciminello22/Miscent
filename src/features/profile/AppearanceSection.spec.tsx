import { act, fireEvent, renderWithTheme } from '@/test/render';
import { resetAppearanceForTests } from '@/ui/appearanceStore';
import { AppearanceControl, AppearanceSection } from './AppearanceSection';

/**
 * Nivel 3 · la fila "Apariencia" del Perfil (10B): tres opciones, Automático de
 * fábrica, y la elección repinta el tema.
 */

describe('AppearanceControl · Automático · Claro · Oscuro', () => {
  it('muestra las tres opciones, en ese orden, y la ayuda de Automático', async () => {
    const view = await renderWithTheme(<AppearanceControl value="auto" onChange={jest.fn()} />);

    expect(view.getByText('Apariencia')).toBeTruthy();
    expect(view.getByText('Automático sigue el ajuste del iPhone.')).toBeTruthy();
    const names = view.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel);
    expect(names).toEqual(['Automático', 'Claro', 'Oscuro']);
  });

  it('marca la elegida y no solo por color', async () => {
    const view = await renderWithTheme(<AppearanceControl value="dark" onChange={jest.fn()} />);

    expect(view.getByRole('radio', { name: 'Oscuro' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole('radio', { name: 'Claro' }).props.accessibilityState.selected).toBe(false);
    expect(view.getByText('Oscuro, elegido por vos.')).toBeTruthy();
  });

  it('cada opción lleva su ícono', async () => {
    const view = await renderWithTheme(<AppearanceControl value="auto" onChange={jest.fn()} />);

    expect(view.getByTestId('appearance-icon-auto')).toBeTruthy();
    expect(view.getByTestId('appearance-icon-light')).toBeTruthy();
    expect(view.getByTestId('appearance-icon-dark')).toBeTruthy();
  });

  it('avisa la opción que se toca', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(<AppearanceControl value="auto" onChange={onChange} />);

    await fireEvent.press(view.getByRole('radio', { name: 'Claro' }));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});

describe('AppearanceSection · conectada al tema', () => {
  beforeEach(async () => {
    await act(async () => resetAppearanceForTests());
  });

  it('empieza en Automático y al elegir Oscuro cambia la selección', async () => {
    const view = await renderWithTheme(<AppearanceSection />);

    expect(view.getByRole('radio', { name: 'Automático' }).props.accessibilityState.selected).toBe(
      true,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'Oscuro' }));

    expect(view.getByRole('radio', { name: 'Oscuro' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByText('Oscuro, elegido por vos.')).toBeTruthy();
  });
});
