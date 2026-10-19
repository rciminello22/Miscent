import { StyleSheet, type TextStyle } from 'react-native';
import { fireEvent, renderWithTheme } from '@/test/render';
import { colorSchemes } from '@/ui/colors';
import type { MovementRow } from './buildMovementList';
import { FilterSegmented } from './FilterSegmented';
import { MovementDayList } from './MovementRowView';
import { MonthSummary } from './MonthSummary';
import { buildMonthCalendar } from './calendarGrid';
import { monthFigures, monthShape } from './movementsTab';
import { filterSegments, groupRowsByDay } from './movementsView';

/**
 * Nivel 3 · lo que dicen y hacen las piezas de Movimientos (§16): el N1, el
 * control segmentado y las filas.
 */

const TODAY = '2026-10-15';

function row(overrides: Partial<MovementRow> & { id: string; date: string }): MovementRow {
  return {
    kind: 'personal-expense',
    label: 'cafe',
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
    ...overrides,
  };
}

describe('MonthSummary · el N1', () => {
  const rows = [
    row({ id: 'a', date: '2026-10-14' }),
    row({ id: 'b', date: '2026-10-15' }),
    row({ id: 'c', date: '2026-10-15' }),
  ];
  const shapeOf = (month: string, source: MovementRow[]) =>
    monthShape(buildMonthCalendar({ month, today: TODAY, rows: source }));
  const base = {
    monthLabel: 'Octubre',
    figures: monthFigures({ rows, month: '2026-10', today: TODAY }),
    shape: shapeOf('2026-10', rows),
    review: null,
    onPrevious: jest.fn(),
    onNext: null,
  };

  it('el mes, el día de hoy y las dos cifras: registros hoy y en octubre', async () => {
    const view = await renderWithTheme(<MonthSummary {...base} />);

    expect(view.getByText('Octubre')).toBeTruthy();
    expect(view.getByText('Hoy, jueves 15 de octubre')).toBeTruthy();
    expect(view.getByLabelText('2 registros hoy')).toBeTruthy();
    expect(view.getByLabelText('3 en octubre')).toBeTruthy();
    expect(view.getByText('registros hoy')).toBeTruthy();
    expect(view.getByText('en octubre')).toBeTruthy();
  });

  it('CA-00 · cuenta registros: ninguna cifra de plata', async () => {
    const view = await renderWithTheme(<MonthSummary {...base} />);

    expect(view.queryByText(/\$/)).toBeNull();
  });

  it('la forma del mes: un punto por día, sin tocar, con un solo texto para el lector', async () => {
    const view = await renderWithTheme(<MonthSummary {...base} />);

    expect(view.getAllByTestId(/^shape-dot-/, { includeHiddenElements: true })).toHaveLength(31);
    expect(view.getByLabelText('Forma del mes: registraste en 2 días')).toBeTruthy();
    // Solo las flechas del mes son botones: la forma no se toca.
    expect(view.getAllByRole('button')).toHaveLength(2);
  });

  it('K10 · "1 para revisar en Casa", si hay', async () => {
    const view = await renderWithTheme(<MonthSummary {...base} review="1 para revisar en Casa" />);
    expect(view.getByText('1 para revisar en Casa')).toBeTruthy();

    const without = await renderWithTheme(<MonthSummary {...base} />);
    expect(without.queryByText(/para revisar/)).toBeNull();
  });

  it('en el mes en curso la flecha siguiente está deshabilitada', async () => {
    const onPrevious = jest.fn();
    const view = await renderWithTheme(<MonthSummary {...base} onPrevious={onPrevious} />);

    const next = view.getByRole('button', { name: 'Mes siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getByRole('button', { name: 'Mes anterior' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('en un mes que ya pasó la flecha siguiente funciona', async () => {
    const onNext = jest.fn();
    const view = await renderWithTheme(<MonthSummary {...base} onNext={onNext} />);

    const next = view.getByRole('button', { name: 'Mes siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('un mes pasado: sin "Hoy", el título es el mes (una sola vez) y las cifras cambian', async () => {
    const september = [row({ id: 's', date: '2026-09-02' }), row({ id: 't', date: '2026-09-02' })];
    const view = await renderWithTheme(
      <MonthSummary
        {...base}
        monthLabel="Septiembre"
        figures={monthFigures({ rows: september, month: '2026-09', today: TODAY })}
        shape={shapeOf('2026-09', september)}
        onNext={jest.fn()}
      />,
    );

    expect(view.getAllByText('Septiembre')).toHaveLength(1);
    expect(view.queryByText(/Hoy/)).toBeNull();
    expect(view.getByText('registros en septiembre')).toBeTruthy();
    expect(view.getByText('día con registros')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Agregar' })).toBeNull();
  });

  it('hoy y los días futuros se distinguen en la forma del mes, y lo relleno de lo vacío', async () => {
    const view = await renderWithTheme(<MonthSummary {...base} />);
    const style = (day: number) =>
      StyleSheet.flatten(view.getByTestId(`shape-dot-${day}`, { includeHiddenElements: true }).props.style);

    expect(style(14).backgroundColor).toBe(colorSchemes.light.spent);
    expect(style(13).backgroundColor).toBe('transparent');
    expect(style(15).height).toBeGreaterThan(style(14).height);
    expect(style(20).opacity).toBeLessThan(1);
  });
});

describe('FilterSegmented · Todos · Personales · uno por espacio', () => {
  const segments = filterSegments([{ id: 'casa', name: 'Casa' }]);

  it('sin espacios no se dibuja', async () => {
    const view = await renderWithTheme(
      <FilterSegmented segments={[]} value="all" onChange={jest.fn()} />,
    );

    expect(view.queryByRole('radio', { name: 'Todos' })).toBeNull();
  });

  it('marca el elegido y cambia al tocar otro', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <FilterSegmented segments={segments} value="all" onChange={onChange} />,
    );

    expect(view.getByRole('radio', { name: 'Todos' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole('radio', { name: 'Casa' }).props.accessibilityState.selected).toBe(false);

    await fireEvent.press(view.getByRole('radio', { name: 'Casa' }));
    expect(onChange).toHaveBeenCalledWith('casa');
  });
});

describe('MovementDayList · la lista agrupada por día', () => {
  const rows = [
    row({
      id: 'shared:1',
      date: TODAY,
      label: 'Supermercado',
      kind: 'shared-expense',
      category: 'supermercado',
      amount: 50_000,
      total: 100_000,
      spaceId: 'casa',
      spaceName: 'Casa',
      payerLabel: 'pagó vos',
      audience: { kind: 'shared', otherMemberName: 'Martina' },
    }),
    row({
      id: 'movement:2',
      date: '2026-10-14',
      label: 'Zapatillas',
      category: 'ropa',
      amount: 180_000,
      effect: '6 cuotas de $30.000',
      effectKind: 'installments',
    }),
    row({
      id: 'payment:3',
      date: '2026-10-10',
      label: 'Martina te pagó',
      kind: 'member-payment',
      category: null,
      amount: 20_000,
      spaceId: 'casa',
      spaceName: 'Casa',
      note: 'no cambia tu radar',
      audience: { kind: 'shared', otherMemberName: 'Martina' },
    }),
    row({ id: 'movement:4', date: '2026-10-09', label: 'cafe' }),
  ];
  const groups = groupRowsByDay(rows, TODAY);

  it('un encabezado por día, con "Hoy · 15 oct"', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
    );

    expect(view.getByText('Hoy · 15 oct')).toBeTruthy();
    expect(view.getByText('14 oct')).toBeTruthy();
    expect(view.getByText('10 oct')).toBeTruthy();
  });

  it('K9 · de un compartido, tu parte arriba y el total en gris', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
    );

    expect(view.getByText('−$50.000')).toBeTruthy();
    expect(view.getByText('de $100.000')).toBeTruthy();
    expect(view.getByText('Casa · pagó vos')).toBeTruthy();
  });

  describe('15 · la regla de signos en la fila', () => {
    const colorOf = (node: { props: { style?: unknown } }) =>
      StyleSheet.flatten(node.props.style as TextStyle).color;

    const signed = groupRowsByDay(
      [
        row({ id: 'movement:1', date: TODAY, label: 'cafe', amount: 4_500 }),
        row({
          id: 'movement:2',
          date: TODAY,
          label: 'Sueldo',
          kind: 'personal-income',
          category: 'sueldo',
          amount: 1_200_000,
          effect: 'Extra',
          effectKind: 'income',
        }),
        row({
          id: 'payment:3',
          date: TODAY,
          label: 'Martina te pagó',
          kind: 'member-payment',
          paymentDirection: 'received',
          category: null,
          amount: 20_000,
          spaceId: 'casa',
          spaceName: 'Casa',
          note: 'no cambia tu radar',
          audience: { kind: 'shared', otherMemberName: 'Martina' },
        }),
        row({
          id: 'payment:4',
          date: TODAY,
          label: 'Le pagaste a Martina',
          kind: 'member-payment',
          paymentDirection: 'sent',
          category: null,
          amount: 15_000,
          spaceId: 'casa',
          spaceName: 'Casa',
          note: 'no cambia tu radar',
          audience: { kind: 'shared', otherMemberName: 'Martina' },
        }),
      ],
      TODAY,
    );

    it('lo que sale lleva el menos tipográfico, en texto normal (nunca rojo)', async () => {
      const view = await renderWithTheme(
        <MovementDayList groups={signed} showSpace onOpen={jest.fn()} />,
      );

      const cafe = view.getByText('−$4.500');
      expect(colorOf(cafe)).toBe(colorSchemes.light.text);
      expect(colorOf(cafe)).not.toBe(colorSchemes.light.danger);
    });

    it('lo que entra lleva el más y el color brand: un ingreso y un pago recibido', async () => {
      const view = await renderWithTheme(
        <MovementDayList groups={signed} showSpace onOpen={jest.fn()} />,
      );

      expect(colorOf(view.getByText('+$1.200.000'))).toBe(colorSchemes.light.brand);
      expect(colorOf(view.getByText('+$20.000'))).toBe(colorSchemes.light.brand);
    });

    it('un pago que hiciste vos sale: −, sin color, y el ⇄ no va junto al monto', async () => {
      const view = await renderWithTheme(
        <MovementDayList groups={signed} showSpace onOpen={jest.fn()} />,
      );

      expect(colorOf(view.getByText('−$15.000'))).toBe(colorSchemes.light.text);
      // El monto es solo el monto: el ⇄ vive en el recuadro de la izquierda.
      expect(view.queryByText(/⇄/)).toBeNull();
    });

    it('el pago lleva el ⇄ como ícono a la izquierda, en un recuadro teal (shared)', async () => {
      const view = await renderWithTheme(
        <MovementDayList groups={signed} showSpace onOpen={jest.fn()} />,
      );

      const tiles = view.getAllByTestId('payment-icon');
      expect(tiles).toHaveLength(2);
      for (const tile of tiles) {
        expect(StyleSheet.flatten(tile.props.style).backgroundColor).toBe(
          colorSchemes.light.sharedSoft,
        );
      }
      expect(view.getAllByText('Casa · no cambia tu radar')).toHaveLength(2);
    });

    it('el total gris de un compartido no lleva signo', async () => {
      const view = await renderWithTheme(
        <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
      );

      expect(view.getByText('de $100.000')).toBeTruthy();
      expect(view.queryByText(/[+−]\$100\.000/)).toBeNull();
    });

    it('lector de pantalla: gasto de, ingreso de, te pagaron, pagaste (nunca "menos" ni "más")', async () => {
      const view = await renderWithTheme(
        <MovementDayList groups={signed} showSpace onOpen={jest.fn()} />,
      );

      expect(view.getByRole('button', { name: 'Cafe, gasto de $4.500' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'Sueldo, ingreso de $1.200.000' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'Martina te pagó, te pagaron $20.000' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'Le pagaste a Martina, pagaste $15.000' })).toBeTruthy();
    });
  });

  it('dentro de un espacio el nombre sobra', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace={false} onOpen={jest.fn()} />,
    );

    expect(view.getByText('pagó vos')).toBeTruthy();
    expect(view.queryByText('Casa · pagó vos')).toBeNull();
  });

  it('la segunda línea, solo si agrega algo: el efecto y "no cambia tu radar"', async () => {
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={jest.fn()} />,
    );

    expect(view.getByText('6 cuotas de $30.000')).toBeTruthy();
    expect(view.getByText('Casa · no cambia tu radar')).toBeTruthy();
  });

  it('Montos · 11 · con un monto enorme el nombre se corta con "…" y el monto nunca', async () => {
    const big = groupRowsByDay(
      [
        row({
          id: 'movement:9',
          date: TODAY,
          label: 'Supermercado de la esquina del barrio',
          amount: 999_999_999,
          total: 999_999_999,
        }),
      ],
      TODAY,
    );
    const view = await renderWithTheme(
      <MovementDayList groups={big} showSpace onOpen={jest.fn()} />,
    );

    const title = view.getByText('Supermercado de la esquina del barrio');
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe('tail');

    const amount = view.getByText('−$999.999.999');
    expect(amount.props.numberOfLines).toBe(1);
    expect(amount.props.adjustsFontSizeToFit).toBeUndefined();
  });

  it('abre la fila que se toca', async () => {
    const onOpen = jest.fn();
    const view = await renderWithTheme(
      <MovementDayList groups={groups} showSpace onOpen={onOpen} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Zapatillas, gasto de $180.000' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'movement:2' }));
  });

  it('SA-02 · la fila de un espacio del que saliste abre su detalle de solo lectura, y lo dice', async () => {
    const former = groupRowsByDay(
      [
        row({
          id: 'shared:9',
          date: TODAY,
          label: 'Cena',
          formerSpace: true,
          spaceId: 'casa',
          spaceName: 'Casa',
        }),
      ],
      TODAY,
    );
    const onOpen = jest.fn();
    const view = await renderWithTheme(
      <MovementDayList groups={former} showSpace onOpen={onOpen} />,
    );

    // Es tocable como cualquier fila (UX-11): botón, y sigue diciendo que ya no sos miembro.
    await fireEvent.press(view.getByRole('button', { name: /Cena/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'shared:9' }));
    expect(view.getByText('Casa · Ya no sos miembro')).toBeTruthy();
    expect(view.getByTestId('chevron', { includeHiddenElements: true })).toBeTruthy();
  });
});
