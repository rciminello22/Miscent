import { fireEvent, renderWithTheme } from '@/test/render';
import type { MovementRow } from './buildMovementList';
import { buildMonthCalendar } from './calendarGrid';
import { MiniCalendar } from './MiniCalendar';

/**
 * El mini calendario del N1 (§16, variante B): tocar un día con registros abre
 * la lista de ese día, uno vacío responde en el lugar y los futuros no
 * responden. Cuenta registros, nunca plata (CA-00).
 */

const TODAY = '2026-10-15';

function row(id: string, date: string): MovementRow {
  return {
    id,
    kind: 'personal-expense',
    label: 'cafe',
    date,
    amount: 4_500,
    total: null,
    context: null,
    category: 'gastronomia',
    spaceName: null,
    payerLabel: null,
    effect: null,
    effectKind: null,
    audience: { kind: 'private' },
    spaceId: null,
    note: null,
    deletable: true,
    reviewTag: null,
    formerSpace: false,
  };
}

const calendar = buildMonthCalendar({
  month: '2026-10',
  today: TODAY,
  rows: [row('a', '2026-10-14'), row('b', '2026-10-14'), row('c', '2026-10-15')],
});

describe('MiniCalendar', () => {
  it('la cabecera L M M J V S D y los días del mes', async () => {
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={jest.fn()} />);

    // La cabecera se esconde del lector: cada día ya dice su día de la semana.
    const hidden = { includeHiddenElements: true };
    expect(view.getByText('L', hidden)).toBeTruthy();
    expect(view.getAllByText('M', hidden)).toHaveLength(2);
    expect(view.getByText('D', hidden)).toBeTruthy();
    expect(view.getByText('1')).toBeTruthy();
    expect(view.getByText('31')).toBeTruthy();
  });

  it('un día con registros anuncia la fecha y cuántos, y abre la lista de ese día', async () => {
    const onOpenDay = jest.fn();
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={onOpenDay} />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' }),
    );

    expect(onOpenDay).toHaveBeenCalledWith('2026-10-14');
    expect(view.queryByText(/No registraste nada/)).toBeNull();
  });

  it('un día sin registros no navega: la frase aparece bajo el calendario, con rol de estado', async () => {
    const onOpenDay = jest.fn();
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={onOpenDay} />);

    await fireEvent.press(view.getByRole('button', { name: 'Viernes 9 de octubre, sin registros' }));

    expect(onOpenDay).not.toHaveBeenCalled();
    const message = view.getByText('No registraste nada el 9 de octubre.');
    expect(message).toBeTruthy();
    expect(view.getByRole('status')).toBeTruthy();
  });

  it('la frase se va al tocar otro día', async () => {
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={jest.fn()} />);

    await fireEvent.press(view.getByRole('button', { name: 'Viernes 9 de octubre, sin registros' }));
    expect(view.getByText('No registraste nada el 9 de octubre.')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Sábado 10 de octubre, sin registros' }));
    expect(view.queryByText('No registraste nada el 9 de octubre.')).toBeNull();
    expect(view.getByText('No registraste nada el 10 de octubre.')).toBeTruthy();

    await fireEvent.press(
      view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' }),
    );
    expect(view.queryByText(/No registraste nada/)).toBeNull();
  });

  it('los días futuros no son botones, no responden y se anuncian como "todavía no llegó"', async () => {
    const onOpenDay = jest.fn();
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={onOpenDay} />);

    expect(view.queryByRole('button', { name: /Viernes 16 de octubre/ })).toBeNull();
    const future = view.getByLabelText('Viernes 16 de octubre, todavía no llegó');
    await fireEvent.press(future);

    expect(onOpenDay).not.toHaveBeenCalled();
    expect(view.queryByText(/No registraste nada/)).toBeNull();
  });

  it('hoy es un día más: se anuncia como hoy y abre su lista', async () => {
    const onOpenDay = jest.fn();
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={onOpenDay} />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Jueves 15 de octubre, hoy, 1 registro' }),
    );
    expect(onOpenDay).toHaveBeenCalledWith('2026-10-15');
  });

  it('CA-00 · el calendario no muestra ninguna cifra de plata', async () => {
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={jest.fn()} />);

    expect(view.queryByText(/\$/)).toBeNull();
  });

  it('cada día es un área de toque de 44pt de alto', async () => {
    const view = await renderWithTheme(<MiniCalendar calendar={calendar} onOpenDay={jest.fn()} />);

    const day = view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' });
    const style = Array.isArray(day.props.style)
      ? Object.assign({}, ...day.props.style.flat(Infinity).filter(Boolean))
      : day.props.style;
    expect(style.height ?? style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
