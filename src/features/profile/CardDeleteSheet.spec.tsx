import { fireEvent, renderWithTheme } from '@/test/render';
import { CardDeleteSheet } from './CardDeleteSheet';

/**
 * P24 · eliminar una tarjeta. Con pagos por venir, una hoja dice qué la retiene
 * y hasta cuándo, y solo ofrece "Entendido". Sin ellos, la confirmación dice qué
 * pasa con lo pasado.
 */
describe('CardDeleteSheet', () => {
  const retained = {
    kind: 'retained' as const,
    lines: [
      'Tiene 2 compras en un resumen que todavía no venció, hasta noviembre.',
      'Tiene un fijo activo: Netflix.',
    ],
  };

  it('con pagos por venir: qué la retiene, la promesa y solo "Entendido"', async () => {
    const onClose = jest.fn();
    const view = await renderWithTheme(
      <CardDeleteSheet state={retained} onClose={onClose} onConfirm={jest.fn()} />,
    );

    expect(view.getByText('Tiene 2 compras en un resumen que todavía no venció, hasta noviembre.')).toBeTruthy();
    expect(view.getByText('Tiene un fijo activo: Netflix.')).toBeTruthy();
    expect(view.getByText('Cuando terminen la vas a poder eliminar.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Eliminar' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Entendido' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sin pagos por venir: la confirmación con [Eliminar] y [Cancelar]', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await renderWithTheme(
      <CardDeleteSheet
        state={{
          kind: 'confirm',
          title: '¿Eliminar Visa Galicia?',
          message:
            'Sus compras pasadas quedan en Movimientos, sin tarjeta. Tus meses pasados no cambian.',
        }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(view.getByText('¿Eliminar Visa Galicia?')).toBeTruthy();
    expect(
      view.getByText(
        'Sus compras pasadas quedan en Movimientos, sin tarjeta. Tus meses pasados no cambian.',
      ),
    ).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cerrada no muestra nada', async () => {
    const view = await renderWithTheme(
      <CardDeleteSheet state={null} onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(view.queryByText('Entendido')).toBeNull();
    expect(view.queryByText('Cancelar')).toBeNull();
  });
});
