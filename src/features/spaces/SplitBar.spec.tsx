import { renderWithTheme } from '@/test/render';
import { SplitBar } from './SplitBar';

/** Nivel 3 · el reparto como barra: dos tramos y los dos montos, sin porcentajes (P3). */
describe('SplitBar', () => {
  it('dice "Tu parte" y "Parte de Martina" con sus montos', async () => {
    const view = await renderWithTheme(
      <SplitBar myShare={50_000} otherShare={50_000} otherName="Martina" />,
    );

    expect(view.getByText('Tu parte')).toBeTruthy();
    expect(view.getByText('Parte de Martina')).toBeTruthy();
    expect(view.getAllByText('$50.000')).toHaveLength(2);
  });

  it('dibuja los dos tramos proporcionales', async () => {
    const view = await renderWithTheme(
      <SplitBar myShare={60_000} otherShare={40_000} otherName="Martina" />,
    );

    const mine = view.getByTestId('split-bar-mine').props.style;
    const other = view.getByTestId('split-bar-other').props.style;
    expect(mine.flex).toBeCloseTo(0.6);
    expect(other.flex).toBeCloseTo(0.4);
  });

  it('P3 · sin porcentajes en ningún lado', async () => {
    const view = await renderWithTheme(
      <SplitBar myShare={60_000} otherShare={40_000} otherName="Martina" />,
    );

    expect(view.queryByText(/%/)).toBeNull();
  });

  it('el lector de pantalla lee los dos montos, no solo la forma', async () => {
    const view = await renderWithTheme(
      <SplitBar myShare={60_000} otherShare={40_000} otherName="Martina" />,
    );

    expect(
      view.getByLabelText('Reparto: tu parte $60.000, parte de Martina $40.000'),
    ).toBeTruthy();
  });
});
