import { fireEvent, renderWithTheme } from '@/test/render';
import { CardDaysSheet, type CardDaysSheetState } from './CardDaysSheet';

/**
 * §22, T-06 · antes de guardar los días de una tarjeta, una hoja dice qué se
 * mueve con "antes → ahora". Los meses pasados no cambian. Una compra de un
 * espacio lleva su nota: la otra persona ve las fechas, no la tarjeta (C-05).
 */

const state = {
  title: 'Se recalculan 3 pagos de noviembre en adelante',
  rows: [
    {
      key: 'a',
      kind: 'installments',
      shared: false,
      title: 'Zapatillas · cuota 3 de 6',
      caption: '~2 dic → 5 dic · las que siguen se mueven igual',
    },
    {
      key: 'b',
      kind: 'installments',
      shared: true,
      title: 'Heladera · Casa · cuota 2 de 6',
      caption: '~2 dic → 5 dic · las que siguen se mueven igual',
    },
    { key: 'c', kind: 'fixed', shared: false, title: 'Netflix · fijo', caption: '~2 dic → 5 dic' },
  ],
  notes: [
    {
      title: 'El saldo con Martina cambia en la fecha nueva de cada cuota.',
      detail: 'Martina ve las fechas, no la tarjeta.',
    },
  ],
} satisfies CardDaysSheetState;

describe('CardDaysSheet', () => {
  it('el título, que los meses pasados no cambian y una fila "antes → ahora" por pago', async () => {
    const view = await renderWithTheme(
      <CardDaysSheet state={state} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    expect(view.getByText('Se recalculan 3 pagos de noviembre en adelante')).toBeTruthy();
    expect(view.getByText('Los meses pasados no cambian.')).toBeTruthy();
    expect(view.getByText('Zapatillas · cuota 3 de 6')).toBeTruthy();
    expect(view.getByText('Heladera · Casa · cuota 2 de 6')).toBeTruthy();
    expect(view.getByText('Netflix · fijo')).toBeTruthy();
    expect(view.getAllByText('~2 dic → 5 dic · las que siguen se mueven igual')).toHaveLength(2);
  });

  it('la nota de lo compartido, con el nombre de la persona', async () => {
    const view = await renderWithTheme(
      <CardDaysSheet state={state} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    expect(
      view.getByText('El saldo con Martina cambia en la fecha nueva de cada cuota.'),
    ).toBeTruthy();
    expect(view.getByText('Martina ve las fechas, no la tarjeta.')).toBeTruthy();
  });

  it('sin compras compartidas no hay nota', async () => {
    const view = await renderWithTheme(
      <CardDaysSheet
        state={{ ...state, rows: state.rows.slice(2), notes: [] }}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(view.queryByText(/ve las fechas/)).toBeNull();
  });

  it('[Guardar cambios] confirma y [Cancelar] vuelve a la edición', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await renderWithTheme(
      <CardDaysSheet state={state} onConfirm={onConfirm} onClose={onClose} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Guardar cambios' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sin estado no se muestra nada', async () => {
    const view = await renderWithTheme(
      <CardDaysSheet state={null} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    expect(view.queryByText('Guardar cambios')).toBeNull();
  });

  it('tono neutral: ninguna palabra de alarma', async () => {
    const view = await renderWithTheme(
      <CardDaysSheet state={state} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    for (const alarm of [/cuidado/i, /atenci[oó]n/i, /error/i, /peligro/i]) {
      expect(view.queryByText(alarm)).toBeNull();
    }
  });
});
