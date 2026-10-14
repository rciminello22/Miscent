import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { GuestWelcome, PersonalMoneyCard } from './GuestCards';

/** Nivel 3 · §33 U1 · la pantalla principal del invitado. */
describe('GuestWelcome', () => {
  it('dice dónde está y quién ve lo que carga', async () => {
    const view = await renderWithTheme(
      <GuestWelcome spaceName="Casa" otherName="Renzo" onDismiss={jest.fn()} />,
    );
    expect(view.getByText('Estás en Casa.')).toBeTruthy();
    expect(view.getByText(/Lo que cargues acá lo ven vos y Renzo/)).toBeTruthy();
  });
});

describe('PersonalMoneyCard', () => {
  const base = { spaceName: 'Casa', otherName: 'Renzo', onCreate: jest.fn(), onNotNow: jest.fn() };

  it('§33 · el texto de la tarjeta, sin candados', async () => {
    const view = await renderWithTheme(<PersonalMoneyCard {...base} reduced={false} />);
    expect(
      view.getByText(
        'Casa es lo que compartís con Renzo. Tus ingresos y tus gastos propios son otra cosa: si querés, podés ordenarlos acá, en privado.',
      ),
    ).toBeTruthy();
    await fireEvent.press(view.getByText('Ahora no'));
    expect(base.onNotNow).toHaveBeenCalled();
  });

  it('"Ahora no" la reduce a una línea', async () => {
    const view = await renderWithTheme(<PersonalMoneyCard {...base} reduced />);
    expect(view.queryByText('Tu plata personal')).toBeNull();
    expect(view.getByText('Crear mi cuenta personal')).toBeTruthy();
  });
});
