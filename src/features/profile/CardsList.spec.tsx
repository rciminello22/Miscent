import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { mastercard, visa } from '@domain/__tests__/fixtures';
import { CardsList } from './CardsList';

/**
 * P24 · "Tus tarjetas": una puerta por tarjeta con su próximo resumen estimado.
 * Tocarla abre el detalle; agregar otra no pasa por el wizard. Nunca número,
 * límite, pago mínimo ni intereses (T-01).
 */
const rows = [
  { card: mastercard, line: '2 nov · resumen estimado · $60.000' },
  { card: visa, line: 'Sin resumen por venir' },
];

describe('CardsList', () => {
  it('cada tarjeta dice su nombre y su próximo resumen estimado', async () => {
    const view = await renderWithTheme(
      <CardsList rows={rows} onOpen={() => {}} onAdd={() => {}} />,
    );

    expect(view.getByText('Mastercard')).toBeTruthy();
    expect(view.getByText('Visa Galicia')).toBeTruthy();
    expect(view.getByText('2 nov · resumen estimado · $60.000')).toBeTruthy();
    expect(view.getByText('Sin resumen por venir')).toBeTruthy();
  });

  it('cada fila es una puerta: lleva chevron y abre ESA tarjeta', async () => {
    const onOpen = jest.fn();
    const view = await renderWithTheme(
      <CardsList rows={rows} onOpen={onOpen} onAdd={() => {}} />,
    );

    expect(view.getAllByTestId('chevron', { includeHiddenElements: true })).toHaveLength(2);
    await fireEvent.press(view.getByLabelText('Visa Galicia. Sin resumen por venir'));

    expect(onOpen).toHaveBeenCalledWith('visa');
  });

  it('agregar otra es un botón', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <CardsList rows={rows.slice(1)} onOpen={() => {}} onAdd={onAdd} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Agregar otra tarjeta' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('sin tarjetas, lo dice y ofrece agregar la primera', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(<CardsList rows={[]} onOpen={() => {}} onAdd={onAdd} />);

    expect(view.getByText('Todavía no cargaste ninguna tarjeta.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Agregar una tarjeta' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
