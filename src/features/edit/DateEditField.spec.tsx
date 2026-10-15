import { renderWithTheme, fireEvent } from '@/test/render';
import { DateEditField } from './DateEditField';

/**
 * UX-18 · la fecha en la edición: editable en un gasto de un solo pago, solo
 * lectura y con su motivo en una compra en cuotas (F2).
 */

const REASON =
  'La fecha de una compra en cuotas no se cambia: de ella salen los meses de las cuotas.';

describe('UX-18 · DateEditField', () => {
  it('editable: ofrece Hoy, Ayer y Otra fecha, y elegir Ayer cambia la fecha', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <DateEditField
        value="2026-10-10"
        onChange={onChange}
        today="2026-10-14"
        editability={{ editable: true }}
      />,
    );

    expect(view.getByText('Fecha')).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Hoy' })).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: 'Ayer' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-13');
  });

  it('solo lectura: muestra la fecha y por qué no se cambia, sin selector', async () => {
    const view = await renderWithTheme(
      <DateEditField
        value="2026-10-10"
        onChange={() => {}}
        today="2026-10-14"
        editability={{ editable: false, reason: REASON }}
      />,
    );

    expect(view.getByText('Fecha')).toBeTruthy();
    expect(view.getByText('10 de octubre')).toBeTruthy();
    expect(view.getByText(REASON)).toBeTruthy();
    expect(view.queryByRole('radio', { name: 'Hoy' })).toBeNull();
    expect(view.queryByRole('radio', { name: 'Ayer' })).toBeNull();
  });
});
