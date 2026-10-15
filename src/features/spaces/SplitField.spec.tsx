import { renderWithTheme, fireEvent } from '@/test/render';
import { SplitField } from './SplitField';

/**
 * UX-15 · "¿Cómo lo reparten?" no aparece al tipear el primer dígito: depende
 * del destino, no del monto. Mientras no hay monto está, pero apagado.
 */

function renderField(total: number, onChange = jest.fn()) {
  return renderWithTheme(
    <SplitField
      total={total}
      split={{ mode: 'even' }}
      onChange={onChange}
      mySlot={1}
      myName="Renzo"
      otherName="Martina"
    />,
  );
}

describe('UX-15 · SplitField', () => {
  it('con monto, el reparto se puede cambiar', async () => {
    const onChange = jest.fn();
    const view = await renderField(10_000, onChange);

    expect(view.getByText('¿Cómo lo reparten?')).toBeTruthy();
    await fireEvent.press(view.getByRole('tab', { name: 'Personalizado' }));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('sin monto el campo ya está, para que no salte, y no se puede tocar', async () => {
    const onChange = jest.fn();
    const view = await renderField(0, onChange);

    expect(view.getByText('¿Cómo lo reparten?')).toBeTruthy();
    expect(view.getByRole('tab', { name: '50/50' })).toBeTruthy();

    await fireEvent.press(view.getByRole('tab', { name: 'Personalizado' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
