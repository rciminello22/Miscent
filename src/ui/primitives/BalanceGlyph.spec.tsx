import { renderWithTheme } from '@/test/render';
import { BalanceGlyph } from './BalanceGlyph';

/**
 * Nivel 3 · la balanza mini de la caja del ícono de una fila de espacio: inclinada
 * hacia quien puso de más, o nivelada con un tilde. Un estado, no una proporción.
 */
const hidden = { includeHiddenElements: true };

describe('BalanceGlyph', () => {
  it('se lee como una imagen con la descripción del estado', async () => {
    const view = await renderWithTheme(
      <BalanceGlyph direction={-1} showCheck={false} label="Balanza inclinada hacia vos." />,
    );

    expect(view.getByLabelText('Balanza inclinada hacia vos.')).toBeTruthy();
    expect(view.getByRole('image')).toBeTruthy();
  });

  it('nivelada lleva el tilde', async () => {
    const view = await renderWithTheme(
      <BalanceGlyph direction={0} showCheck label="Balanza nivelada, con una tilde." />,
    );

    expect(view.getByTestId('balance-glyph-check', hidden)).toBeTruthy();
  });

  it('inclinada no lleva tilde', async () => {
    const view = await renderWithTheme(
      <BalanceGlyph direction={1} showCheck={false} label="Balanza inclinada hacia Sofía." />,
    );

    expect(view.queryByTestId('balance-glyph-check', hidden)).toBeNull();
  });

  it('la inclinación es fija y sale del estado: izquierda, derecha o ninguna', async () => {
    const left = await renderWithTheme(<BalanceGlyph direction={-1} showCheck={false} label="a" />);
    const right = await renderWithTheme(<BalanceGlyph direction={1} showCheck={false} label="b" />);
    const level = await renderWithTheme(<BalanceGlyph direction={0} showCheck label="c" />);

    expect(left.getByTestId('balance-glyph-left', hidden)).toBeTruthy();
    expect(right.getByTestId('balance-glyph-right', hidden)).toBeTruthy();
    expect(level.getByTestId('balance-glyph-level', hidden)).toBeTruthy();
  });
});
