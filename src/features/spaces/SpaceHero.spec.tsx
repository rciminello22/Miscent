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
  lines: { lead: 'Martina te debe', amount: 20_000, tail: null },
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
    // Montos · 11 · la frase y la cifra van en dos líneas.
    expect(view.getByText('Martina te debe')).toBeTruthy();
    expect(view.getByText('$20.000')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Agregar gasto'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('la cifra grande se ajusta en una línea, sin abreviar', async () => {
    const view = await renderWithTheme(
      <SpaceHero
        {...base}
        sentence="Martina te debe $999.999.999"
        lines={{ lead: 'Martina te debe', amount: 999_999_999, tail: null }}
      />,
    );
    const figure = view.getByText('$999.999.999');

    expect(figure.props.numberOfLines).toBe(1);
    expect(figure.props.adjustsFontSizeToFit).toBe(true);
  });

  it('le debés: la cifra en el medio y a quién después', async () => {
    const view = await renderWithTheme(
      <SpaceHero
        {...base}
        sentence="Le debés $5.000 a Martina"
        lines={{ lead: 'Le debés', amount: 5_000, tail: 'a Martina' }}
      />,
    );

    expect(view.getByText('Le debés')).toBeTruthy();
    expect(view.getByText('$5.000')).toBeTruthy();
    expect(view.getByText('a Martina')).toBeTruthy();
  });

  it('están a mano: sin "Registrar pago", que no hay nada que saldar', async () => {
    const view = await renderWithTheme(
      <SpaceHero
        {...base}
        sentence="Están a mano"
        lines={{ lead: 'Están a mano', amount: null, tail: null }}
      />,
    );
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
