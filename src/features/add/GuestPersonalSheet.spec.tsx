import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { GuestPersonalContent } from './GuestPersonalSheet';

/**
 * Nivel 3 · CA-07 · Caso 18. "Un usuario sin cuenta personal que elige
 * 'Personal' en Agregar ve la hoja del Caso 18 y no puede guardar un gasto
 * personal." El texto es el de la spec, literal.
 */

const base = {
  spaceName: 'Casa',
  onCreateAccount: jest.fn(),
  onLoadInSpace: jest.fn(),
  onCancel: jest.fn(),
};

describe('GuestPersonalContent', () => {
  it('explica dónde viven los gastos personales', async () => {
    const view = await renderWithTheme(<GuestPersonalContent {...base} />);
    expect(
      view.getByText(
        'Tus gastos personales viven en tu cuenta personal, que es privada. Todavía no la creaste.',
      ),
    ).toBeTruthy();
  });

  it('ofrece las tres salidas del Caso 18', async () => {
    const view = await renderWithTheme(<GuestPersonalContent {...base} />);
    await fireEvent.press(view.getByText('Crear mi cuenta personal'));
    await fireEvent.press(view.getByText('Cargarlo en Casa'));
    await fireEvent.press(view.getByText('Cancelar'));
    expect(base.onCreateAccount).toHaveBeenCalled();
    expect(base.onLoadInSpace).toHaveBeenCalled();
    expect(base.onCancel).toHaveBeenCalled();
  });

  it('dice que el borrador no se pierde', async () => {
    const view = await renderWithTheme(<GuestPersonalContent {...base} />);
    expect(view.getByText(/se guarda en tu cuenta personal cuando termines/)).toBeTruthy();
  });
});
