import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { personalRecurrence } from '@domain/__tests__/fixtures';
import { FixedExpensesList } from './FixedExpensesList';

/**
 * UX-21 · "Tus fijos": desde Perfil se llega al fijo para corregirlo (F-03), y
 * dar de alta uno es una decisión explícita, nunca un efecto de querer editar
 * el que ya existe (antes Perfil > Fijos abría el wizard y lo duplicaba).
 */

const alquiler = personalRecurrence({
  id: 'alquiler',
  kind: 'expense',
  amount: 400_000,
  dayOfMonth: 5,
  startMonth: '2026-01',
  category: 'alquiler',
});

const gimnasio = personalRecurrence({
  id: 'gimnasio',
  kind: 'expense',
  amount: 35_000,
  dayOfMonth: 12,
  startMonth: '2026-01',
  category: 'salud',
  description: 'Gimnasio',
});

describe('UX-21 · FixedExpensesList', () => {
  it('cada fila dice qué es, cuánto y qué día se paga', async () => {
    const view = await renderWithTheme(
      <FixedExpensesList fixed={[alquiler, gimnasio]} onOpen={() => {}} onAdd={() => {}} />,
    );

    expect(view.getByText('Alquiler')).toBeTruthy();
    expect(view.getByText('Gimnasio')).toBeTruthy();
    expect(view.getByText('cada día 5')).toBeTruthy();
    expect(view.getByText('cada día 12')).toBeTruthy();
    expect(view.getByText('$400.000')).toBeTruthy();
    expect(view.getByText('$35.000')).toBeTruthy();
  });

  it('tocar una fila abre ESE fijo', async () => {
    const onOpen = jest.fn();
    const view = await renderWithTheme(
      <FixedExpensesList fixed={[alquiler, gimnasio]} onOpen={onOpen} onAdd={() => {}} />,
    );

    await fireEvent.press(view.getByText('Gimnasio'));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('gimnasio');
  });

  it('agregar otro es un botón aparte', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <FixedExpensesList fixed={[alquiler]} onOpen={() => {}} onAdd={onAdd} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Agregar otro fijo' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('sin fijos, lo dice y ofrece cargar el primero', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <FixedExpensesList fixed={[]} onOpen={() => {}} onAdd={onAdd} />,
    );

    expect(view.getByText('Todavía no cargaste ningún fijo.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Agregar un fijo' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
