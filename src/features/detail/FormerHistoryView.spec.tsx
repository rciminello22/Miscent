import { fireEvent, renderWithTheme } from '@/test/render';
import type { FormerHistoryDetail } from './formerHistoryDetail';
import { FormerHistoryView } from './FormerHistoryView';

/**
 * SA-02 · SA-05 · el detalle de solo lectura de un registro de un espacio del
 * que saliste: lo que quedó en la foto, sin Editar ni Eliminar.
 */

const expense: FormerHistoryDetail = {
  kind: 'expense',
  title: 'Supermercado',
  context: 'Con gonzalo · ya no sos miembro',
  amount: 30_000,
  sign: 'out',
  ofTotal: 60_000,
  facts: [
    { label: 'Fecha', value: '8 de octubre' },
    { label: 'Espacio', value: 'Con gonzalo' },
    { label: 'Tu parte', value: '−$30.000' },
    { label: 'Total del gasto', value: '$60.000' },
  ],
  note: 'Saliste de Con gonzalo: este gasto quedó en tu historial.',
};

describe('FormerHistoryView · un gasto de un espacio del que saliste', () => {
  it('el título, tu parte con "−" y el total en gris', async () => {
    const view = await renderWithTheme(<FormerHistoryView detail={expense} onClose={jest.fn()} />);

    expect(view.getByText('Supermercado')).toBeTruthy();
    expect(view.getByText('Con gonzalo · ya no sos miembro')).toBeTruthy();
    // La cifra grande y la fila "Tu parte" de la tarjeta.
    expect(view.getAllByText('−$30.000')).toHaveLength(2);
    expect(view.getByText('de $60.000')).toBeTruthy();
  });

  it('la tarjeta con la fecha, el espacio y el total del gasto', async () => {
    const view = await renderWithTheme(<FormerHistoryView detail={expense} onClose={jest.fn()} />);

    expect(view.getByText('Fecha')).toBeTruthy();
    expect(view.getByText('8 de octubre')).toBeTruthy();
    expect(view.getByText('Espacio')).toBeTruthy();
    expect(view.getByText('Con gonzalo')).toBeTruthy();
    expect(view.getByText('Total del gasto')).toBeTruthy();
    expect(view.getByText('$60.000')).toBeTruthy();
  });

  it('la tarjeta que dice que quedó en tu historial', async () => {
    const view = await renderWithTheme(<FormerHistoryView detail={expense} onClose={jest.fn()} />);

    expect(
      view.getByText('Saliste de Con gonzalo: este gasto quedó en tu historial.'),
    ).toBeTruthy();
  });

  it('es de solo lectura: ni Editar ni Eliminar', async () => {
    const view = await renderWithTheme(<FormerHistoryView detail={expense} onClose={jest.fn()} />);

    expect(view.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(view.queryByRole('button', { name: /Eliminar/ })).toBeNull();
    // El único botón es para cerrar.
    expect(view.getAllByRole('button')).toHaveLength(1);
  });

  it('Cerrar vuelve', async () => {
    const onClose = jest.fn();
    const view = await renderWithTheme(<FormerHistoryView detail={expense} onClose={onClose} />);

    await fireEvent.press(view.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el lector de pantalla dice "gasto de" y no "menos"', async () => {
    const view = await renderWithTheme(<FormerHistoryView detail={expense} onClose={jest.fn()} />);

    expect(view.getByLabelText('gasto de $30.000')).toBeTruthy();
  });
});

describe('FormerHistoryView · un pago entre miembros', () => {
  const payment: FormerHistoryDetail = {
    kind: 'payment',
    title: 'Martina te pagó',
    context: 'Con gonzalo · ya no sos miembro',
    amount: 20_000,
    sign: 'in',
    ofTotal: null,
    facts: [
      { label: 'Fecha', value: '10 de octubre' },
      { label: 'Espacio', value: 'Con gonzalo' },
    ],
    note: 'Saliste de Con gonzalo: este pago quedó en tu historial.',
  };

  it('lo que entra lleva "+" y no tiene total en gris', async () => {
    const view = await renderWithTheme(<FormerHistoryView detail={payment} onClose={jest.fn()} />);

    expect(view.getByText('+$20.000')).toBeTruthy();
    expect(view.queryByText(/^de \$/)).toBeNull();
    expect(view.getByLabelText('te pagaron $20.000')).toBeTruthy();
  });
});
