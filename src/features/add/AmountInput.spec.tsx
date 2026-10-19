import { useState } from 'react';
import { fireEvent, renderWithTheme } from '@/test/render';
import { AmountInput } from './AmountInput';

/**
 * Nivel 3 · el campo de monto (§17 campo 2) y su tope de $999.999.999: un dígito
 * de más se ignora y aparece el aviso; borrar sigue andando.
 */

const LIMIT_NOTICE = 'El monto máximo es $999.999.999';

function Harness({ initial = 0 }: { initial?: number }) {
  const [amount, setAmount] = useState(initial);
  return <AmountInput value={amount} onChange={setAmount} autoFocus={false} />;
}

describe('AmountInput · el tope', () => {
  it('escribe con el formato es-AR y sin aviso', async () => {
    const view = await renderWithTheme(<Harness />);

    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '1234567');

    expect(view.getByLabelText('Monto en pesos').props.value).toBe('1.234.567');
    expect(view.queryByText(LIMIT_NOTICE)).toBeNull();
  });

  it('el tope exacto entra', async () => {
    const view = await renderWithTheme(<Harness />);

    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '999999999');

    expect(view.getByLabelText('Monto en pesos').props.value).toBe('999.999.999');
    expect(view.queryByText(LIMIT_NOTICE)).toBeNull();
  });

  it('un dígito de más se ignora, no se borra lo escrito, y aparece el aviso', async () => {
    const view = await renderWithTheme(<Harness initial={999_999_999} />);

    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '9.999.999.999');

    expect(view.getByLabelText('Monto en pesos').props.value).toBe('999.999.999');
    expect(view.getByText(LIMIT_NOTICE)).toBeTruthy();
  });

  it('borrar sigue andando y el aviso se va', async () => {
    const view = await renderWithTheme(<Harness initial={999_999_999} />);
    const input = view.getByLabelText('Monto en pesos');

    await fireEvent.changeText(input, '9.999.999.999');
    expect(view.getByText(LIMIT_NOTICE)).toBeTruthy();

    await fireEvent.changeText(input, '99.999.999');
    expect(view.getByLabelText('Monto en pesos').props.value).toBe('99.999.999');
    expect(view.queryByText(LIMIT_NOTICE)).toBeNull();
  });
});
