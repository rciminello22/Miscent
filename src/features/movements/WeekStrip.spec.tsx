import { fireEvent, renderWithTheme } from '@/test/render';
import type { MovementRow } from './buildMovementList';
import { buildMonthCalendar } from './calendarGrid';
import { stripView } from './movementsTab';
import { WeekStrip } from './WeekStrip';

/**
 * §16 · la franja de una semana (16A): tocar un día elige qué muestra la lista
 * (no navega), "Todo el mes" se prende y se apaga, los futuros no responden y
 * las flechas se frenan en la semana de hoy. Cuenta registros, nunca plata.
 */

// Jueves 15 de octubre: la semana de hoy tiene tres días futuros (16, 17 y 18).
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
    paymentDirection: null,
  };
}

const calendar = buildMonthCalendar({
  month: '2026-10',
  today: TODAY,
  rows: [row('a', '2026-10-14'), row('b', '2026-10-14'), row('c', '2026-10-15')],
});

function setup(weekIndex = 2, overrides: Partial<Parameters<typeof WeekStrip>[0]> = {}) {
  const props = {
    strip: stripView({ calendar, weekIndex, month: '2026-10', today: TODAY }),
    selectedDate: TODAY,
    wholeMonth: false,
    onSelectDay: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    onToggleMonth: jest.fn(),
    ...overrides,
  };
  return { props, render: () => renderWithTheme(<WeekStrip {...props} />) };
}

describe('WeekStrip', () => {
  it('el rango, la cabecera L M M J V S D y los siete días de la semana', async () => {
    const view = await setup().render();

    expect(view.getByText('12 al 18 de octubre')).toBeTruthy();
    // La cabecera se esconde del lector: cada día ya dice su día de la semana.
    const hidden = { includeHiddenElements: true };
    expect(view.getByText('L', hidden)).toBeTruthy();
    expect(view.getByText('D', hidden)).toBeTruthy();
    for (const day of ['12', '13', '14', '15', '16', '17', '18']) {
      expect(view.getByText(day)).toBeTruthy();
    }
    expect(view.queryByText('19')).toBeNull();
  });

  it('tocar un día lo elige, sin navegar: avisa con la fecha y nada más', async () => {
    const { props, render } = setup();
    const view = await render();

    await fireEvent.press(
      view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' }),
    );

    expect(props.onSelectDay).toHaveBeenCalledTimes(1);
    expect(props.onSelectDay).toHaveBeenCalledWith('2026-10-14');
  });

  it('un día sin registros también se elige: la lista lo dirá', async () => {
    const { props, render } = setup();
    const view = await render();

    await fireEvent.press(view.getByRole('button', { name: 'Martes 13 de octubre, sin registros' }));
    expect(props.onSelectDay).toHaveBeenCalledWith('2026-10-13');
  });

  it('los días futuros no son botones, no responden y se anuncian como "todavía no llegó"', async () => {
    const { props, render } = setup();
    const view = await render();

    expect(view.queryByRole('button', { name: /Viernes 16 de octubre/ })).toBeNull();
    await fireEvent.press(view.getByLabelText('Viernes 16 de octubre, todavía no llegó'));
    await fireEvent.press(view.getByLabelText('Domingo 18 de octubre, todavía no llegó'));

    expect(props.onSelectDay).not.toHaveBeenCalled();
  });

  it('hoy se anuncia como hoy y el día elegido, como elegido', async () => {
    const view = await setup().render();

    const today = view.getByRole('button', { name: 'Jueves 15 de octubre, hoy, 1 registro' });
    expect(today.props.accessibilityState.selected).toBe(true);
    const other = view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' });
    expect(other.props.accessibilityState.selected).toBe(false);
  });

  it('"Todo el mes" prendido: ningún día está elegido y la franja se atenúa', async () => {
    const view = await setup(2, { selectedDate: null, wholeMonth: true }).render();

    const days = view.getAllByRole('button').filter((node) => node.props.accessibilityState?.selected != null);
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((node) => node.props.accessibilityState.selected === false)).toBe(true);
    expect(view.getByRole('switch', { name: 'Todo el mes' }).props.accessibilityState.checked).toBe(true);
  });

  it('"Todo el mes" se prende y se apaga con el mismo toque', async () => {
    const { props, render } = setup();
    const view = await render();

    const toggle = view.getByRole('switch', { name: 'Todo el mes' });
    expect(toggle.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(toggle);
    await fireEvent.press(toggle);
    expect(props.onToggleMonth).toHaveBeenCalledTimes(2);
  });

  it('con "Todo el mes" prendido, tocar un día igual avisa (la pantalla lo apaga)', async () => {
    const { props, render } = setup(2, { selectedDate: null, wholeMonth: true });
    const view = await render();

    await fireEvent.press(view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' }));
    expect(props.onSelectDay).toHaveBeenCalledWith('2026-10-14');
  });

  it('las flechas de 44pt cambian de semana', async () => {
    const { props, render } = setup(1);
    const view = await render();

    await fireEvent.press(view.getByRole('button', { name: 'Semana anterior' }));
    await fireEvent.press(view.getByRole('button', { name: 'Semana siguiente' }));

    expect(props.onPrevious).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it('en la semana de hoy la flecha siguiente se frena: deshabilitada y sin respuesta', async () => {
    const { props, render } = setup(2);
    const view = await render();

    const next = view.getByRole('button', { name: 'Semana siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(next);
    expect(props.onNext).not.toHaveBeenCalled();
    expect(view.getByRole('button', { name: 'Semana anterior' }).props.accessibilityState.disabled).toBe(
      false,
    );
  });

  it('en la primera semana del mes la flecha anterior se frena', async () => {
    const view = await setup(0).render();

    expect(view.getByRole('button', { name: 'Semana anterior' }).props.accessibilityState.disabled).toBe(
      true,
    );
    expect(view.getByText('1 al 4 de octubre')).toBeTruthy();
  });

  it('la leyenda del punto queda siempre: "días con registros"', async () => {
    const view = await setup().render();

    expect(view.getByText('días con registros')).toBeTruthy();
  });

  it('CA-00 · la franja no muestra ninguna cifra de plata', async () => {
    const view = await setup().render();

    expect(view.queryByText(/\$/)).toBeNull();
  });

  it('cada día es un área de toque de 44pt de alto', async () => {
    const view = await setup().render();

    const day = view.getByRole('button', { name: 'Miércoles 14 de octubre, 2 registros' });
    const style = Array.isArray(day.props.style)
      ? Object.assign({}, ...day.props.style.flat(Infinity).filter(Boolean))
      : day.props.style;
    expect(style.height ?? style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
