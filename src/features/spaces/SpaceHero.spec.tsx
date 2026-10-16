import { Text } from 'react-native';
import { fireEvent, renderWithTheme } from '@/test/render';
import { SpaceHero } from './SpaceHero';

/**
 * Nivel 3 · el N1 del espacio. Agregar gasto siempre; "Registrar pago" solo si
 * hay saldo; "Invitar" solo si el lugar del otro está vacío.
 */
const base = {
  spaceName: 'Casa',
  scale: <Text>[balanza]</Text>,
  sentence: 'Martina te debe $20.000',
  advance: null,
  note: null,
  invite: null,
  onPay: null,
  onAdd: jest.fn(),
};

describe('SpaceHero', () => {
  it('el nombre, la balanza, la frase del saldo y la acción principal', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(<SpaceHero {...base} onAdd={onAdd} />);
    expect(view.getByText('Casa')).toBeTruthy();
    expect(view.getByText('[balanza]')).toBeTruthy();
    expect(view.getByText('Martina te debe $20.000')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Agregar gasto'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('están a mano: sin "Registrar pago", que no hay nada que saldar', async () => {
    const view = await renderWithTheme(<SpaceHero {...base} sentence="Están a mano" />);
    expect(view.getByText('Están a mano')).toBeTruthy();
    expect(view.queryByLabelText('Registrar pago')).toBeNull();
  });

  it('con saldo, "Registrar pago"', async () => {
    const onPay = jest.fn();
    const view = await renderWithTheme(<SpaceHero {...base} onPay={onPay} />);
    await fireEvent.press(view.getByLabelText('Registrar pago'));
    expect(onPay).toHaveBeenCalledTimes(1);
  });

  it('el otro todavía no entró: la nota y UNA invitación', async () => {
    const onInvite = jest.fn();
    const view = await renderWithTheme(
      <SpaceHero
        {...base}
        note="Martina todavía no entró. Cargás por los dos."
        invite={{ label: 'Invitar a Martina', onPress: onInvite }}
      />,
    );
    expect(view.getByText('Martina todavía no entró. Cargás por los dos.')).toBeTruthy();
    expect(view.getAllByLabelText('Invitar a Martina')).toHaveLength(1);

    await fireEvent.press(view.getByLabelText('Invitar a Martina'));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('con el otro adentro no se invita a nadie', async () => {
    const view = await renderWithTheme(<SpaceHero {...base} />);
    expect(view.queryByLabelText(/Invitar/)).toBeNull();
  });

  it('§25 · el aviso de adelanto aparece solo cuando aplica', async () => {
    const without = await renderWithTheme(<SpaceHero {...base} />);
    expect(without.queryByText(/adelantó/)).toBeNull();

    const withAdvance = await renderWithTheme(
      <SpaceHero {...base} advance="Martina adelantó $10.000 de cuotas que todavía no vencieron." />,
    );
    expect(withAdvance.getByText(/adelantó \$10\.000/)).toBeTruthy();
  });
});
