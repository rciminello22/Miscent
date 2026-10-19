import { StyleSheet, type TextStyle } from 'react-native';
import { fireEvent, renderWithTheme } from '@/test/render';
import { colorSchemes } from '@/ui/colors';
import type { MovementRow } from './buildMovementList';
import { FilterSegmented } from './FilterSegmented';
import { MovementDayList } from './MovementRowView';
import { MovementsHeader } from './MovementsHeader';
import { buildMonthCalendar } from './calendarGrid';
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

describe('MovementsHeader · el N1', () => {
  const calendar = buildMonthCalendar({
    month: '2026-10',
    today: TODAY,
    rows: [row({ id: 'a', date: '2026-10-14' })],
  });
  const base = {
    monthLabel: 'Octubre',
    headline: '1 registro',
    calendar,
    onOpenDay: jest.fn(),
    onPrevious: jest.fn(),
    onNext: null,
    onAdd: null,
  };

  it('el mes, la frase, "en N días" y el mini calendario con sus días', async () => {
    const onOpenDay = jest.fn();
    const view = await renderWithTheme(<MovementsHeader {...base} onOpenDay={onOpenDay} />);

    expect(view.getByText('Octubre')).toBeTruthy();
    expect(view.getByText('1 registro')).toBeTruthy();
    expect(view.getByText('en 1 día')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Miércoles 14 de octubre, 1 registro' }));
    expect(onOpenDay).toHaveBeenCalledWith('2026-10-14');
    expect(view.getByLabelText('Viernes 16 de octubre, todavía no llegó')).toBeTruthy();
  });

  it('sin registros no hay "en N días"', async () => {
    const empty = buildMonthCalendar({ month: '2026-10', today: TODAY, rows: [] });
    const view = await renderWithTheme(
      <MovementsHeader {...base} calendar={empty} headline="Todavía no registraste nada en octubre." />,
    );

    expect(view.queryByText(/^en \d+ días?$/)).toBeNull();
  });

  it('en el mes en curso la flecha siguiente está deshabilitada', async () => {
    const onPrevious = jest.fn();
    const view = await renderWithTheme(<MovementsHeader {...base} onPrevious={onPrevious} />);

    const next = view.getByRole('button', { name: 'Mes siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getByRole('button', { name: 'Mes anterior' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('en un mes que ya pasó la flecha siguiente funciona', async () => {
    const onNext = jest.fn();
    const view = await renderWithTheme(<MovementsHeader {...base} onNext={onNext} />);

    const next = view.getByRole('button', { name: 'Mes siguiente' });
    expect(next.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('§16 · el mes en curso vacío trae su Agregar adentro', async () => {
    const onAdd = jest.fn();
    const view = await renderWithTheme(
      <MovementsHeader
        {...base}
        headline="Todavía no registraste nada en octubre."
        onAdd={onAdd}
      />,
    );

    expect(view.getByText('Todavía no registraste nada en octubre.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Agregar' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('un mes que ya pasó, vacío: sin botón Agregar', async () => {
    const view = await renderWithTheme(
      <MovementsHeader {...base} headline="No registraste nada en agosto." onNext={jest.fn()} />,
    );

    expect(view.getByText('No registraste nada en agosto.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Agregar' })).toBeNull();
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
          effect: 'Ingreso registrado',
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

  it('SA-02 · un espacio del que saliste no tiene detalle: la fila no es un botón', async () => {
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
    const view = await renderWithTheme(
      <MovementDayList groups={former} showSpace onOpen={jest.fn()} />,
    );

    expect(view.queryByRole('button', { name: /Cena/ })).toBeNull();
    expect(view.getByText('Cena')).toBeTruthy();
    // Sin chevron ni rol de botón, pero con la pista de por qué no se abre.
    expect(view.getByText('Casa · Ya no sos miembro')).toBeTruthy();
  });
});
