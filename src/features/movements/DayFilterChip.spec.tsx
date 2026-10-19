import { fireEvent, renderWithTheme } from '@/test/render';
import { DayFilterChip } from './DayFilterChip';

/**
 * El chip "Miércoles 14 ✕" arriba de la lista filtrada por un día: dice el
 * filtro y lo deshace, y mide 44pt.
 */
describe('DayFilterChip', () => {
  it('dice el día y, al tocarlo, quita el filtro', async () => {
    const onClear = jest.fn();
    const view = await renderWithTheme(<DayFilterChip date="2026-10-14" onClear={onClear} />);

    expect(view.getByText('Miércoles 14')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Miércoles 14, quitar el filtro de día' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('mide 44pt de alto', async () => {
    const view = await renderWithTheme(<DayFilterChip date="2026-10-14" onClear={jest.fn()} />);

    const chip = view.getByRole('button', { name: 'Miércoles 14, quitar el filtro de día' });
    const style = Object.assign({}, ...[chip.props.style].flat(Infinity).filter(Boolean));
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
