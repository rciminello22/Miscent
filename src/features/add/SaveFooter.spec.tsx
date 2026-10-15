import { Button, type Audience } from '@/ui/primitives';
import { renderWithTheme } from '@/test/render';
import { SaveFooter } from './SaveFooter';

/**
 * UX-16 · el motivo de un Guardar deshabilitado se ve bajo el botón.
 */

const PRIVATE: Audience = { kind: 'private' };

describe('UX-14 · PR-03 · SaveFooter · la audiencia', () => {
  it('lo personal dice "Solo vos lo ves" junto al botón', async () => {
    const view = await renderWithTheme(
      <SaveFooter audience={PRIVATE} reason={null}>
        <Button label="Guardar" />
      </SaveFooter>,
    );

    expect(view.getByText('Solo vos lo ves')).toBeTruthy();
  });

  it('lo compartido nombra a quien lo va a ver', async () => {
    const view = await renderWithTheme(
      <SaveFooter audience={{ kind: 'shared', otherMemberName: 'Martina' }} reason={null}>
        <Button label="Guardar" variant="shared" />
      </SaveFooter>,
    );

    expect(view.getByText('Lo ven vos y Martina')).toBeTruthy();
    expect(view.queryByText('Solo vos lo ves')).toBeNull();
  });

  it('se ve aunque Guardar esté deshabilitado y con motivo', async () => {
    const view = await renderWithTheme(
      <SaveFooter audience={PRIVATE} reason="Elegí una categoría">
        <Button label="Guardar" disabled />
      </SaveFooter>,
    );

    expect(view.getByText('Solo vos lo ves')).toBeTruthy();
    expect(view.getByText('Elegí una categoría')).toBeTruthy();
  });
});

describe('UX-16 · SaveFooter · el motivo', () => {
  it('muestra el motivo bajo el botón', async () => {
    const view = await renderWithTheme(
      <SaveFooter audience={PRIVATE} reason="Elegí una categoría">
        <Button label="Guardar" disabled />
      </SaveFooter>,
    );

    expect(view.getByText('Elegí una categoría')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('sin motivo no agrega nada', async () => {
    const view = await renderWithTheme(
      <SaveFooter audience={PRIVATE} reason={null}>
        <Button label="Guardar" />
      </SaveFooter>,
    );

    expect(view.queryByText('Elegí una categoría')).toBeNull();
    expect(view.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });
});
