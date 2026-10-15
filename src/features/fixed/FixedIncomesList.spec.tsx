import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { personalRecurrence } from '@domain/__tests__/fixtures';
import { FixedIncomesList } from './FixedIncomesList';

/**
 * UX-01 · "Tus ingresos": desde Perfil se llega al ingreso fijo para
 * corregirlo, y registrar uno nuevo es una decisión explícita, nunca un
 * efecto de querer editar el que ya existe.
 */

const sueldo = personalRecurrence({
  id: 'sueldo',
  kind: 'income',
  amount: 1_200_000,
  dayOfMonth: 5,
  startMonth: '2026-01',
  category: 'sueldo',
});

const freelance = personalRecurrence({
  id: 'freelance',
  kind: 'income',
  amount: 300_000,
  dayOfMonth: 20,
  startMonth: '2026-01',
  category: 'sueldo',
  description: 'Diseño web',
});

describe('UX-01 · FixedIncomesList', () => {
  it('cada fila dice qué es, cuánto y qué día se cobra', async () => {
    const view = await renderWithTheme(
      <FixedIncomesList incomes={[sueldo, freelance]} onOpen={() => {}} onAdd={() => {}} />,
    );

    expect(view.getByText('Sueldo')).toBeTruthy();
    expect(view.getByText('Diseño web')).toBeTruthy();
    expect(view.getByText('cada día 5')).toBeTruthy();
    expect(view.getByText('cada día 20')).toBeTruthy();
    expect(view.getByText('$1.200.000')).toBeTruthy();
    expect(view.getByText('$300.000')).toBeTruthy();
  });

  it('tocar una fila abre ESE ingreso (para editarlo o ajustar un mes)', async () => {
    const onOpen = jest.fn();
    const view = await renderWithTheme(
      <FixedIncomesList incomes={[sueldo, freelance]} onOpen={onOpen} onAdd={() => {}} />,
    );

    await fireEvent.press(view.getByText('Diseño web'));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('freelance');
  });

  it('con ingresos, agregar otro es un botón aparte', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <FixedIncomesList incomes={[sueldo]} onOpen={() => {}} onAdd={onAdd} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Agregar otro ingreso' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('sin ingresos, el estado vacío ofrece registrar uno', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <FixedIncomesList incomes={[]} onOpen={() => {}} onAdd={onAdd} />,
    );

    expect(view.getByText('Todavía no registraste ningún ingreso.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Agregar otro ingreso' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Registrar mi ingreso' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
