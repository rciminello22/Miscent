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

  it('el reparto se dibuja una sola vez, como barra: tu parte y la del otro', async () => {
    const view = await renderField(100_000);

    expect(view.getByText('Tu parte')).toBeTruthy();
    expect(view.getByText('Parte de Martina')).toBeTruthy();
    expect(view.getAllByText('$50.000')).toHaveLength(2);
    // Ya no hay una línea aparte con "la parte de cada uno".
    expect(view.queryByText('La parte de cada uno')).toBeNull();
  });

  it('personalizado: los campos y la barra muestran las mismas partes', async () => {
    const view = await renderWithTheme(
      <SplitField
        total={100_000}
        split={{ mode: 'custom', shareSlot1: 70_000, shareSlot2: 30_000 }}
        onChange={jest.fn()}
        mySlot={1}
        myName="Renzo"
        otherName="Martina"
      />,
    );

    expect(view.getByLabelText('Reparto: tu parte $70.000, parte de Martina $30.000')).toBeTruthy();
  });

  it('Montos · 11 · en una parte, un dígito de más se ignora y avisa el tope', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <SplitField
        total={999_999_999}
        split={{ mode: 'custom', shareSlot1: 999_999_999, shareSlot2: 0 }}
        onChange={onChange}
        mySlot={1}
        myName="Renzo"
        otherName="Martina"
      />,
    );

    await fireEvent.changeText(view.getByLabelText('Parte de Renzo'), '9.999.999.999');

    expect(view.getByText('El monto máximo es $999.999.999')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith({
      mode: 'custom',
      shareSlot1: 999_999_999,
      shareSlot2: 0,
    });
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
