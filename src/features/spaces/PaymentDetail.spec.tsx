import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { PaymentDetail } from './PaymentDetail';

/**
 * Nivel 3 · §25 · el detalle de un pago entre miembros.
 *
 * Antes, tocar un pago abría directo "¿Eliminar?": quien solo quería mirarlo
 * quedaba a un toque de borrarlo (12/10). P-01 define qué es un pago: quién
 * le pagó a quién, monto, fecha y quién lo registró.
 */

const base = {
  sentence: 'Martina te pagó $20.000',
  date: '2026-10-08',
  recordedBy: { isMe: false, name: 'Martina' },
  onDelete: () => {},
};

describe('PaymentDetail · §25', () => {
  it('P-01 · quién le pagó a quién y cuánto, y cuándo', async () => {
    const view = await renderWithTheme(<PaymentDetail {...base} />);

    expect(view.getByText('Martina te pagó $20.000')).toBeTruthy();
    expect(view.getByText('8 de octubre')).toBeTruthy();
  });

  it('P-01 · quién lo registró: nombra al otro miembro', async () => {
    const view = await renderWithTheme(<PaymentDetail {...base} />);
    expect(view.getByText('Martina')).toBeTruthy();
  });

  it('P-01 · si lo registró uno mismo, dice "Vos"', async () => {
    const view = await renderWithTheme(
      <PaymentDetail {...base} recordedBy={{ isMe: true, name: 'Renzo' }} />,
    );
    expect(view.getByText('Vos')).toBeTruthy();
    expect(view.queryByText('Renzo')).toBeNull();
  });

  it('G-06 · P-04 · aclara que es una declaración y que no cambia el radar', async () => {
    const view = await renderWithTheme(<PaymentDetail {...base} />);
    expect(view.getByText(/la app no verifica la transferencia/)).toBeTruthy();
    expect(view.getByText(/no cambia lo que puso cada uno/i)).toBeTruthy();
  });

  it('opción B · si lo registró el otro y no lo revisaste, "Está bien" lo marca', async () => {
    const onReviewed = jest.fn();
    const view = await renderWithTheme(
      <PaymentDetail {...base} review={{ label: 'Lo cargó Martina · para revisar', onReviewed }} />,
    );

    expect(view.getByText('Lo cargó Martina · para revisar')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Está bien' }));
    expect(onReviewed).toHaveBeenCalledTimes(1);
  });

  it('ya revisado, no aparece', async () => {
    const view = await renderWithTheme(<PaymentDetail {...base} />);
    expect(view.queryByRole('button', { name: 'Está bien' })).toBeNull();
  });

  it('eliminar está adentro, no es lo primero que pasa al tocarlo', async () => {
    const onDelete = jest.fn();
    const view = await renderWithTheme(<PaymentDetail {...base} onDelete={onDelete} />);

    await fireEvent.press(view.getByRole('button', { name: 'Eliminar este pago' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
