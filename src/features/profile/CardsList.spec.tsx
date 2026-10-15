import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { mastercard, visa } from '@domain/__tests__/fixtures';
import { CardsList } from './CardsList';

/**
 * UX-21 · "Tus tarjetas": desde Perfil se ven las que ya existen y se agrega
 * otra sin pasar por el wizard. Editar o eliminar una tarjeta NO está: §22 tiene
 * reglas de recálculo y de eliminación con cuotas activas, así que cada tarjeta
 * es una fila informativa, sin chevron ni rol de botón.
 */
describe('UX-21 · CardsList', () => {
  it('cada tarjeta dice su nombre y sus fechas', async () => {
    const view = await renderWithTheme(<CardsList cards={[mastercard, visa]} onAdd={() => {}} />);

    expect(view.getByText('Mastercard')).toBeTruthy();
    expect(view.getByText('Visa Galicia')).toBeTruthy();
    expect(view.getByText('Cierra el 20, vence el 2')).toBeTruthy();
    expect(view.getByText('Cierra el 25, vence el 5')).toBeTruthy();
  });

  it('las filas son informativas: sin chevron', async () => {
    const view = await renderWithTheme(<CardsList cards={[visa]} onAdd={() => {}} />);

    expect(view.queryByTestId('chevron')).toBeNull();
  });

  it('agregar otra es un botón', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(<CardsList cards={[visa]} onAdd={onAdd} />);

    await fireEvent.press(view.getByRole('button', { name: 'Agregar otra tarjeta' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('sin tarjetas, lo dice y ofrece agregar la primera', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(<CardsList cards={[]} onAdd={onAdd} />);

    expect(view.getByText('Todavía no cargaste ninguna tarjeta.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Agregar una tarjeta' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
