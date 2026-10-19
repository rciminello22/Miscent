import { fireEvent, renderWithTheme } from '@/test/render';
import type { RemovalSheet } from './formerSpaces';
import { RemoveFormerSpaceSheet } from './RemoveFormerSpaceSheet';

/**
 * Quitar un espacio de tu historial · la confirmación (hoja inferior). Dice qué
 * cambia en la cuenta, que para el otro no cambia nada y que no se puede
 * deshacer, ANTES de los botones.
 */

const copy: RemovalSheet = {
  title: '¿Quitar Con gonzalo de tu historial?',
  intro: 'Esto es lo que cambia en tu cuenta:',
  rows: [
    {
      kind: 'radar',
      text: 'Tu radar de agosto, septiembre y octubre deja de contar tu parte de Con gonzalo ($84.000 en total).',
    },
    { kind: 'movements', text: 'Sus 9 gastos desaparecen de Movimientos.' },
    { kind: 'summary', text: 'El resumen "Al salir, Gonzalo te debía $12.000" deja de verse.' },
  ],
  reassurance: 'Para Gonzalo no cambia nada, ni para nadie más.',
  warning: 'No se puede deshacer.',
};

describe('RemoveFormerSpaceSheet', () => {
  it('cerrada no muestra nada', async () => {
    const view = await renderWithTheme(
      <RemoveFormerSpaceSheet copy={null} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    expect(view.queryByText('Esto es lo que cambia en tu cuenta:')).toBeNull();
    expect(view.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });

  it('el título, lo que cambia en tres filas y la tarjeta para el otro', async () => {
    const view = await renderWithTheme(
      <RemoveFormerSpaceSheet copy={copy} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    expect(view.getByText('¿Quitar Con gonzalo de tu historial?')).toBeTruthy();
    expect(view.getByText('Esto es lo que cambia en tu cuenta:')).toBeTruthy();
    for (const row of copy.rows) expect(view.getByText(row.text)).toBeTruthy();
    expect(view.getByText('Para Gonzalo no cambia nada, ni para nadie más.')).toBeTruthy();
  });

  it('"No se puede deshacer." va antes de los botones', async () => {
    const view = await renderWithTheme(
      <RemoveFormerSpaceSheet copy={copy} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );
    const tree = JSON.stringify(view.toJSON());

    expect(view.getByText('No se puede deshacer.')).toBeTruthy();
    expect(tree.indexOf('No se puede deshacer.')).toBeGreaterThan(
      tree.indexOf('El resumen \\"Al salir'),
    );
    expect(tree.indexOf('No se puede deshacer.')).toBeLessThan(tree.indexOf('Cancelar'));
  });

  it('"Cancelar" cierra sin confirmar nada', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await renderWithTheme(
      <RemoveFormerSpaceSheet copy={copy} onConfirm={onConfirm} onClose={onClose} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('"Quitar" confirma', async () => {
    const onConfirm = jest.fn();
    const view = await renderWithTheme(
      <RemoveFormerSpaceSheet copy={copy} onConfirm={onConfirm} onClose={jest.fn()} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Quitar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('mientras quita, "Quitar" está ocupado y "Cancelar" no deja cerrar a medias', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await renderWithTheme(
      <RemoveFormerSpaceSheet copy={copy} loading onConfirm={onConfirm} onClose={onClose} />,
    );

    const confirm = view.getByRole('button', { name: 'Quitar' });
    expect(confirm.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));

    await fireEvent.press(confirm);
    await fireEvent.press(view.getByRole('button', { name: 'Cancelar' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
