import { Button } from '@/ui/primitives';
import { renderWithTheme } from '@/test/render';
import { SaveFooter } from './SaveFooter';

/**
 * UX-16 · el motivo de un Guardar deshabilitado se ve bajo el botón.
 */

describe('UX-16 · SaveFooter · el motivo', () => {
  it('muestra el motivo bajo el botón', async () => {
    const view = await renderWithTheme(
      <SaveFooter reason="Elegí una categoría">
        <Button label="Guardar" disabled />
      </SaveFooter>,
    );

    expect(view.getByText('Elegí una categoría')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('sin motivo no agrega nada', async () => {
    const view = await renderWithTheme(
      <SaveFooter reason={null}>
        <Button label="Guardar" />
      </SaveFooter>,
    );

    expect(view.queryByText('Elegí una categoría')).toBeNull();
    expect(view.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });
});
