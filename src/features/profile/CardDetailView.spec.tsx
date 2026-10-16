import { fireEvent, renderWithTheme } from '@/test/render';
import { visa } from '@domain/__tests__/fixtures';
import type { UpcomingPayment } from '@domain/upcoming';
import { CardDetailView } from './CardDetailView';

/**
 * P24 · el detalle de una tarjeta (N1 + puertas): su próximo resumen estimado,
 * las barras de los próximos vencimientos, el cierre y el vencimiento, y las
 * puertas Compras, Cuotas y Fijos. Solo lo ve su dueño (C-05).
 */

const next = {
  id: 'statement:visa:2026-11',
  kind: 'card-statement',
  label: 'Visa Galicia',
  cardId: 'visa',
  amount: 120_000,
  includesOtherShare: 0,
  otherMemberName: null,
  date: '2026-11-05',
  month: '2026-11',
  approximate: false,
  dateApprox: false,
  hasPassed: false,
  items: [],
  isEstimate: true,
} satisfies UpcomingPayment;

const base = {
  card: visa,
  pills: ['Cierra el 25', 'Vence el 5'] as [string, string],
  nextLine: '5 nov · resumen estimado · $120.000',
  next,
  bars: [
    { month: '2026-11', date: '2026-11-05', amount: 120_000, ratio: 1 },
    { month: '2026-12', date: '2026-12-05', amount: 60_000, ratio: 0.5 },
  ],
  doors: [
    { kind: 'purchase' as const, title: 'Compras', count: 2, subtotal: 40_000 },
    { kind: 'installment' as const, title: 'Cuotas', count: 3, subtotal: 80_000 },
  ],
  editing: false,
  name: 'Visa Galicia',
  canSave: false,
  saving: false,
  onNameChange: jest.fn(),
  onEdit: jest.fn(),
  onCancelEdit: jest.fn(),
  onSave: jest.fn(),
  onOpenStatement: jest.fn(),
  onOpenDoor: jest.fn(),
  onDelete: jest.fn(),
  onClose: jest.fn(),
};

describe('CardDetailView', () => {
  it('el nombre, el cierre y el vencimiento como pastillas, y el próximo resumen estimado', async () => {
    const view = await renderWithTheme(<CardDetailView {...base} />);

    expect(view.getByText('Visa Galicia')).toBeTruthy();
    expect(view.getByText('Cierra el 25')).toBeTruthy();
    expect(view.getByText('Vence el 5')).toBeTruthy();
    expect(view.getByText('$120.000')).toBeTruthy();
    expect(view.getByText('Estimado según lo que registraste')).toBeTruthy();
    expect(view.getByText('Solo vos')).toBeTruthy();
  });

  it('T-02 · un día de "Más o menos" se dice con "~" y "aprox."', async () => {
    const view = await renderWithTheme(
      <CardDetailView {...base} pills={['Cierra el ~15 · aprox.', 'Vence el 5']} />,
    );

    expect(view.getByText('Cierra el ~15 · aprox.')).toBeTruthy();
  });

  it('"Ver qué incluye" abre el detalle del resumen', async () => {
    const onOpenStatement = jest.fn();
    const view = await renderWithTheme(
      <CardDetailView {...base} onOpenStatement={onOpenStatement} />,
    );

    await fireEvent.press(view.getByText('Ver qué incluye'));
    expect(onOpenStatement).toHaveBeenCalledTimes(1);
  });

  it('una barra por vencimiento', async () => {
    const view = await renderWithTheme(<CardDetailView {...base} />);
    const hidden = { includeHiddenElements: true };

    expect(view.getByTestId('statement-bar-2026-11', hidden)).toBeTruthy();
    expect(view.getByTestId('statement-bar-2026-12', hidden)).toBeTruthy();
  });

  it('sin resumen por venir: lo dice y no hay nada que abrir', async () => {
    const view = await renderWithTheme(
      <CardDetailView {...base} next={null} nextLine="Sin resumen por venir" bars={[]} doors={[]} />,
    );

    expect(view.getByText('Sin resumen por venir')).toBeTruthy();
    expect(view.queryByText('Ver qué incluye')).toBeNull();
  });

  it('las puertas Compras y Cuotas dicen cuántas hay y se abren; las vacías no aparecen', async () => {
    const onOpenDoor = jest.fn();
    const view = await renderWithTheme(<CardDetailView {...base} onOpenDoor={onOpenDoor} />);

    expect(view.getByText('Compras')).toBeTruthy();
    expect(view.getByText('Cuotas')).toBeTruthy();
    expect(view.queryByText('Fijos')).toBeNull();

    await fireEvent.press(view.getByLabelText('Cuotas. 3'));
    expect(onOpenDoor).toHaveBeenCalledWith('installment');
  });

  it('el lápiz edita y "Eliminar tarjeta" va al pie', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const view = await renderWithTheme(
      <CardDetailView {...base} onEdit={onEdit} onDelete={onDelete} />,
    );

    await fireEvent.press(view.getByLabelText('Editar'));
    expect(onEdit).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'Eliminar tarjeta' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('editando: el nombre se corrige y los días quedan de solo lectura, con su nota', async () => {
    const onNameChange = jest.fn();
    const onSave = jest.fn();
    const view = await renderWithTheme(
      <CardDetailView
        {...base}
        editing
        canSave
        onNameChange={onNameChange}
        onSave={onSave}
      />,
    );

    await fireEvent.changeText(view.getByLabelText('Nombre de la tarjeta'), 'Visa Plata');
    expect(onNameChange).toHaveBeenCalledWith('Visa Plata');

    expect(view.getByText(/Cierre y vencimiento no se cambian desde acá/)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Eliminar tarjeta' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Guardar' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('editando sin cambios no se puede guardar', async () => {
    const view = await renderWithTheme(<CardDetailView {...base} editing canSave={false} />);

    expect(view.getByRole('button', { name: 'Guardar' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('T-01 · nunca número, límite, pago mínimo ni intereses', async () => {
    const view = await renderWithTheme(<CardDetailView {...base} />);

    for (const forbidden of [/número/i, /l[ií]mite/i, /pago m[ií]nimo/i, /inter[eé]s/i, /disponible/i]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });
});
