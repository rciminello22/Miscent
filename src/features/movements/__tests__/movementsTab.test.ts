import { describe, it, expect } from 'vitest';
import type { MovementRow } from '../buildMovementList';
import { buildMonthCalendar } from '../calendarGrid';
import {
  DOT_HELP_TEXT,
  DOT_LEGEND,
  emptyListMessage,
  filterStyle,
  initialSelection,
  listHeading,
  monthFigures,
  monthShape,
  reviewLine,
  scopeDay,
  selectDay,
  shouldShowDotHelp,
  startingMonth,
  stepWeek,
  stripView,
  toggleWholeMonth,
  weekIndexOf,
} from '../movementsTab';

/**
 * §16 · la pestaña Movimientos reestructurada (16A): el estado (día elegido o
 * todo el mes), la franja de una semana, las dos cifras, la forma del mes y los
 * títulos. TS puro. Todo cuenta REGISTROS, nunca plata (CA-00).
 */

// Domingo 18 de octubre de 2026: el dibujo del usuario.
const TODAY = '2026-10-18';

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

// Los registros del dibujo: 3 hoy y 14 en octubre, en 10 días distintos.
const DAYS = [1, 1, 2, 5, 8, 10, 12, 13, 14, 14, 14, 17, 18, 18];
const OCTOBER = DAYS.map((day, index) =>
  row({ id: `r${index}`, date: `2026-10-${String(day).padStart(2, '0')}` }),
);
const octoberCalendar = buildMonthCalendar({ month: '2026-10', today: TODAY, rows: OCTOBER });

describe('startingMonth · el mes con el que arranca la pestaña', () => {
  it('sin parámetro, el mes en curso', () => {
    expect(startingMonth(undefined, TODAY)).toBe('2026-10');
  });

  it('un mes pasado de la ruta se respeta', () => {
    expect(startingMonth('2026-09', TODAY)).toBe('2026-09');
  });

  it('un mes futuro o mal formado vuelve al mes en curso', () => {
    expect(startingMonth('2026-11', TODAY)).toBe('2026-10');
    expect(startingMonth('2026-13', TODAY)).toBe('2026-10');
    expect(startingMonth('hola', TODAY)).toBe('2026-10');
  });
});

describe('initialSelection · qué muestra la lista al llegar', () => {
  it('el mes en curso arranca en hoy', () => {
    expect(initialSelection({ month: '2026-10', today: TODAY })).toEqual({
      day: TODAY,
      wholeMonth: false,
    });
  });

  it('un mes pasado arranca en "Todo el mes" (no hay un día actual)', () => {
    expect(initialSelection({ month: '2026-09', today: TODAY })).toEqual({
      day: '2026-09-30',
      wholeMonth: true,
    });
  });

  it('un día de la ruta (?dia=) elige ese día, también en un mes pasado', () => {
    expect(initialSelection({ month: '2026-10', today: TODAY, day: '2026-10-09' })).toEqual({
      day: '2026-10-09',
      wholeMonth: false,
    });
    expect(initialSelection({ month: '2026-09', today: TODAY, day: '2026-09-12' })).toEqual({
      day: '2026-09-12',
      wholeMonth: false,
    });
  });

  it('un día que no es del mes o que todavía no llegó se ignora', () => {
    const fallback = { day: TODAY, wholeMonth: false };
    expect(initialSelection({ month: '2026-10', today: TODAY, day: '2026-09-30' })).toEqual(fallback);
    expect(initialSelection({ month: '2026-10', today: TODAY, day: '2026-10-25' })).toEqual(fallback);
    expect(initialSelection({ month: '2026-10', today: TODAY, day: null })).toEqual(fallback);
  });
});

describe('selectDay y toggleWholeMonth · el estado de la lista', () => {
  const base = { day: TODAY, wholeMonth: false };
  const args = { month: '2026-10', today: TODAY };

  it('tocar un día lo elige', () => {
    expect(selectDay(base, '2026-10-09', args)).toEqual({ day: '2026-10-09', wholeMonth: false });
  });

  it('tocar un día con "Todo el mes" prendido lo apaga', () => {
    const month = { day: TODAY, wholeMonth: true };
    expect(selectDay(month, '2026-10-14', args)).toEqual({ day: '2026-10-14', wholeMonth: false });
  });

  it('un día futuro no responde: el estado queda igual', () => {
    expect(selectDay(base, '2026-10-19', args)).toBe(base);
    expect(selectDay(base, '2026-10-31', args)).toBe(base);
  });

  it('un día de otro mes no responde', () => {
    expect(selectDay(base, '2026-09-30', args)).toBe(base);
  });

  it('"Todo el mes" se prende y se apaga, y conserva el día', () => {
    const on = toggleWholeMonth({ day: '2026-10-09', wholeMonth: false });
    expect(on).toEqual({ day: '2026-10-09', wholeMonth: true });
    expect(toggleWholeMonth(on)).toEqual({ day: '2026-10-09', wholeMonth: false });
  });

  it('scopeDay: el día que filtra la lista, o ninguno con "Todo el mes"', () => {
    expect(scopeDay({ day: '2026-10-09', wholeMonth: false })).toBe('2026-10-09');
    expect(scopeDay({ day: '2026-10-09', wholeMonth: true })).toBeNull();
  });
});

describe('la franja de una semana, cortada por el borde del mes', () => {
  // Octubre de 2026 arranca un jueves: [1-4] [5-11] [12-18] [19-25] [26-31].
  it('qué semana tiene cada día', () => {
    expect(weekIndexOf(octoberCalendar, '2026-10-01')).toBe(0);
    expect(weekIndexOf(octoberCalendar, '2026-10-09')).toBe(1);
    expect(weekIndexOf(octoberCalendar, TODAY)).toBe(2);
    expect(weekIndexOf(octoberCalendar, '2026-10-31')).toBe(4);
  });

  it('la semana de hoy: de lunes a domingo, "12 al 18 de octubre"', () => {
    const strip = stripView({ calendar: octoberCalendar, weekIndex: 2, month: '2026-10', today: TODAY });

    expect(strip.range).toBe('12 al 18 de octubre');
    expect(strip.week.map((day) => day?.day)).toEqual([12, 13, 14, 15, 16, 17, 18]);
  });

  it('la primera semana se corta en el 1: "1 al 4 de octubre", con huecos antes del jueves', () => {
    const strip = stripView({ calendar: octoberCalendar, weekIndex: 0, month: '2026-10', today: TODAY });

    expect(strip.range).toBe('1 al 4 de octubre');
    expect(strip.week.map((day) => day?.day ?? null)).toEqual([null, null, null, 1, 2, 3, 4]);
  });

  it('la última semana se corta en el 31: "26 al 31 de octubre"', () => {
    const november = buildMonthCalendar({ month: '2026-10', today: '2026-11-05', rows: [] });
    const strip = stripView({ calendar: november, weekIndex: 4, month: '2026-10', today: '2026-11-05' });

    expect(strip.range).toBe('26 al 31 de octubre');
  });

  it('una semana de un solo día lo dice sin "al": "1 de noviembre"', () => {
    // El 1 de noviembre de 2026 es domingo.
    const calendar = buildMonthCalendar({ month: '2026-11', today: '2026-12-05', rows: [] });
    const strip = stripView({ calendar, weekIndex: 0, month: '2026-11', today: '2026-12-05' });

    expect(strip.range).toBe('1 de noviembre');
  });

  it('las flechas se frenan en la semana de hoy: no hay una siguiente', () => {
    const atToday = stripView({ calendar: octoberCalendar, weekIndex: 2, month: '2026-10', today: TODAY });
    expect(atToday.canNext).toBe(false);
    expect(atToday.canPrevious).toBe(true);

    const before = stripView({ calendar: octoberCalendar, weekIndex: 1, month: '2026-10', today: TODAY });
    expect(before.canNext).toBe(true);
  });

  it('...y en la primera semana del mes no hay una anterior', () => {
    const first = stripView({ calendar: octoberCalendar, weekIndex: 0, month: '2026-10', today: TODAY });
    expect(first.canPrevious).toBe(false);
  });

  it('stepWeek avanza de a una y no pasa de la semana de hoy ni del 1', () => {
    const args = { month: '2026-10', today: TODAY };
    expect(stepWeek(octoberCalendar, 2, -1, args)).toBe(1);
    expect(stepWeek(octoberCalendar, 1, 1, args)).toBe(2);
    expect(stepWeek(octoberCalendar, 2, 1, args)).toBe(2);
    expect(stepWeek(octoberCalendar, 0, -1, args)).toBe(0);
  });

  it('en un mes pasado se llega hasta la última semana del mes', () => {
    const today = TODAY;
    const september = buildMonthCalendar({ month: '2026-09', today, rows: [] });
    // Septiembre de 2026 arranca un martes: [1-6] [7-13] [14-20] [21-27] [28-30].
    const last = stripView({ calendar: september, weekIndex: 4, month: '2026-09', today });

    expect(last.range).toBe('28 al 30 de septiembre');
    expect(last.canNext).toBe(false);
    expect(stripView({ calendar: september, weekIndex: 3, month: '2026-09', today }).canNext).toBe(true);
    expect(stepWeek(september, 4, 1, { month: '2026-09', today })).toBe(4);
  });

  it('cada día de la franja trae su cuenta de registros y si es hoy o futuro', () => {
    const strip = stripView({ calendar: octoberCalendar, weekIndex: 2, month: '2026-10', today: TODAY });
    const byDay = (n: number) => strip.week.find((day) => day?.day === n)!;

    expect(byDay(14).count).toBe(3);
    expect(byDay(15).count).toBe(0);
    expect(byDay(18).isToday).toBe(true);
    expect(byDay(18).count).toBe(2);

    const next = stripView({ calendar: octoberCalendar, weekIndex: 3, month: '2026-10', today: TODAY });
    expect(next.week.every((day) => day?.isFuture === true)).toBe(true);
  });
});

describe('monthFigures · las dos cifras grandes (cuentan registros, nunca plata)', () => {
  it('el mes en curso: "Hoy, domingo 18 de octubre", registros hoy y en octubre', () => {
    const figures = monthFigures({ rows: OCTOBER, month: '2026-10', today: TODAY });

    expect(figures.heading).toBe('Hoy, domingo 18 de octubre');
    expect(figures.primary).toEqual({ value: 2, label: 'registros hoy' });
    expect(figures.secondary).toEqual({ value: 14, label: 'en octubre' });
  });

  it('en singular', () => {
    const one = [row({ id: 'a', date: TODAY })];
    const figures = monthFigures({ rows: one, month: '2026-10', today: TODAY });

    expect(figures.primary).toEqual({ value: 1, label: 'registro hoy' });
    expect(figures.secondary).toEqual({ value: 1, label: 'en octubre' });
  });

  it('un mes sin registros dice cero, no desaparece', () => {
    const figures = monthFigures({ rows: [], month: '2026-10', today: TODAY });

    expect(figures.primary).toEqual({ value: 0, label: 'registros hoy' });
    expect(figures.secondary).toEqual({ value: 0, label: 'en octubre' });
  });

  it('un mes pasado: sin "Hoy"; el título es el mes y las cifras son registros y días con registros', () => {
    const september = [
      row({ id: 'a', date: '2026-09-02' }),
      row({ id: 'b', date: '2026-09-02' }),
      row({ id: 'c', date: '2026-09-20' }),
    ];
    const figures = monthFigures({ rows: september, month: '2026-09', today: TODAY });

    expect(figures.heading).toBe('Septiembre');
    expect(figures.primary).toEqual({ value: 3, label: 'registros en septiembre' });
    expect(figures.secondary).toEqual({ value: 2, label: 'días con registros' });
  });

  it('un mes pasado en singular', () => {
    const figures = monthFigures({
      rows: [row({ id: 'a', date: '2026-09-02' })],
      month: '2026-09',
      today: TODAY,
    });

    expect(figures.primary.label).toBe('registro en septiembre');
    expect(figures.secondary.label).toBe('día con registros');
  });

  it('un mes de otro año lleva el año', () => {
    expect(monthFigures({ rows: [], month: '2025-12', today: TODAY }).heading).toBe(
      'Diciembre de 2025',
    );
  });

  it('CA-00 · ninguna cifra es plata', () => {
    const text = JSON.stringify(monthFigures({ rows: OCTOBER, month: '2026-10', today: TODAY }));

    expect(text).not.toContain('$');
    expect(text).not.toContain('4500');
  });
});

describe('monthShape · la forma del mes (un punto por día, sin tocar)', () => {
  const shape = monthShape(octoberCalendar);

  it('31 puntos, uno por día, en orden', () => {
    expect(shape).toHaveLength(31);
    expect(shape.map((dot) => dot.day)).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
  });

  it('relleno si hubo registros', () => {
    const filled = shape.filter((dot) => dot.filled).map((dot) => dot.day);
    expect(filled).toEqual([1, 2, 5, 8, 10, 12, 13, 14, 17, 18]);
  });

  it('hoy marcado y los días futuros atenuados', () => {
    expect(shape.filter((dot) => dot.isToday).map((dot) => dot.day)).toEqual([18]);
    expect(shape.filter((dot) => dot.isFuture).map((dot) => dot.day)).toEqual([
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    ]);
  });

  it('un mes de 30 días trae 30 puntos', () => {
    const september = buildMonthCalendar({ month: '2026-09', today: TODAY, rows: [] });
    expect(monthShape(september)).toHaveLength(30);
  });

  it('no guarda cuántos registros ni plata: es "hay" o "no hay"', () => {
    expect(Object.keys(shape[0]!).sort()).toEqual(['day', 'date', 'filled', 'isFuture', 'isToday'].sort());
  });
});

describe('reviewLine · "N para revisar en Casa" (K10)', () => {
  const casa = (id: string, tag: string | null) =>
    row({ id, date: TODAY, spaceId: 'casa', spaceName: 'Casa', reviewTag: tag });

  it('sin nada para revisar, no hay línea', () => {
    expect(reviewLine([casa('a', null), row({ id: 'b', date: TODAY })])).toBeNull();
    expect(reviewLine([])).toBeNull();
  });

  it('cuenta los registros para revisar de un espacio', () => {
    expect(reviewLine([casa('a', 'Lo cargó Martina · para revisar')])).toBe('1 para revisar en Casa');
    expect(
      reviewLine([casa('a', 'x'), casa('b', 'y'), casa('c', null)]),
    ).toBe('2 para revisar en Casa');
  });

  it('con más de un espacio los nombra a todos', () => {
    const viaje = row({
      id: 'v',
      date: TODAY,
      spaceId: 'viaje',
      spaceName: 'Viaje',
      reviewTag: 'z',
    });

    expect(reviewLine([casa('a', 'x'), viaje])).toBe('2 para revisar en Casa y Viaje');
    const otro = { ...viaje, id: 'o', spaceId: 'otro', spaceName: 'Otro' };
    expect(reviewLine([casa('a', 'x'), viaje, otro])).toBe('3 para revisar en Casa, Viaje y Otro');
  });
});

describe('listHeading · el encabezado de la lista', () => {
  const day = (date: string) => ({ day: date, wholeMonth: false });
  const month = { day: TODAY, wholeMonth: true };

  it('hoy: "Hoy, domingo 18 · 3 registros"', () => {
    expect(listHeading({ selection: day(TODAY), month: '2026-10', today: TODAY, count: 3 })).toEqual({
      title: 'Hoy, domingo 18',
      count: '3 registros',
      text: 'Hoy, domingo 18 · 3 registros',
    });
  });

  it('otro día: "Viernes 9 · 1 registro"', () => {
    expect(
      listHeading({ selection: day('2026-10-09'), month: '2026-10', today: TODAY, count: 1 }).text,
    ).toBe('Viernes 9 · 1 registro');
  });

  it('un día sin registros: solo el día', () => {
    expect(
      listHeading({ selection: day('2026-10-09'), month: '2026-10', today: TODAY, count: 0 }),
    ).toEqual({ title: 'Viernes 9', count: null, text: 'Viernes 9' });
  });

  it('todo el mes: "Todo octubre · 14 registros"', () => {
    expect(listHeading({ selection: month, month: '2026-10', today: TODAY, count: 14 }).text).toBe(
      'Todo octubre · 14 registros',
    );
  });

  it('todo un mes pasado, y de otro año', () => {
    expect(
      listHeading({ selection: month, month: '2026-09', today: TODAY, count: 21 }).text,
    ).toBe('Todo septiembre · 21 registros');
    expect(
      listHeading({ selection: month, month: '2025-12', today: TODAY, count: 2 }).title,
    ).toBe('Todo diciembre de 2025');
  });
});

describe('emptyListMessage · en lugar de la lista', () => {
  const day = (date: string) => ({ day: date, wholeMonth: false });
  const month = { day: TODAY, wholeMonth: true };

  it('un día sin registros: "No registraste nada el 9 de octubre."', () => {
    expect(
      emptyListMessage({ selection: day('2026-10-09'), month: '2026-10', today: TODAY, anyInMonth: true }),
    ).toBe('No registraste nada el 9 de octubre.');
  });

  it('el mensaje de un día es el mismo con cualquier filtro, haya o no registros en el mes', () => {
    expect(
      emptyListMessage({ selection: day('2026-10-09'), month: '2026-10', today: TODAY, anyInMonth: false }),
    ).toBe('No registraste nada el 9 de octubre.');
  });

  it('hoy sin registros', () => {
    expect(
      emptyListMessage({ selection: day(TODAY), month: '2026-10', today: TODAY, anyInMonth: true }),
    ).toBe('Todavía no registraste nada hoy.');
  });

  it('el mes en curso vacío (§16)', () => {
    expect(
      emptyListMessage({ selection: month, month: '2026-10', today: TODAY, anyInMonth: false }),
    ).toBe('Todavía no registraste nada en octubre.');
  });

  it('un mes pasado vacío', () => {
    expect(
      emptyListMessage({ selection: month, month: '2026-08', today: TODAY, anyInMonth: false }),
    ).toBe('No registraste nada en agosto.');
  });

  it('un mes de otro año', () => {
    expect(
      emptyListMessage({ selection: month, month: '2025-12', today: TODAY, anyInMonth: false }),
    ).toBe('No registraste nada en diciembre de 2025.');
  });

  it('hay registros en el mes pero el filtro los deja afuera', () => {
    expect(
      emptyListMessage({ selection: month, month: '2026-10', today: TODAY, anyInMonth: true }),
    ).toBe('Sin registros acá este mes.');
  });
});

describe('filterStyle · cómo se dibujan los filtros', () => {
  const casa = { key: 'casa', label: 'Casa', kind: 'space' as const };
  const viaje = { key: 'viaje', label: 'Viaje', kind: 'space' as const };
  const all = { key: 'all', label: 'Todos', kind: 'all' as const };
  const personal = { key: 'personal', label: 'Personales', kind: 'personal' as const };

  it('sin espacios no hay nada que filtrar', () => {
    expect(filterStyle([])).toBe('none');
  });

  it('con un espacio: un control segmentado de tres tramos', () => {
    expect(filterStyle([all, personal, casa])).toBe('segmented');
  });

  it('con dos o más espacios: chips desplazables, uno por espacio', () => {
    expect(filterStyle([all, personal, casa, viaje])).toBe('chips');
  });
});

describe('la ayuda del punto: cuándo se muestra', () => {
  it('la primera vez que hay un punto que explicar', () => {
    expect(shouldShowDotHelp({ remembered: false, recordDays: 10 })).toBe(true);
  });

  it('una sola vez: ya entendida, no vuelve', () => {
    expect(shouldShowDotHelp({ remembered: true, recordDays: 10 })).toBe(false);
  });

  it('mientras lee la marca no se sabe: no parpadea', () => {
    expect(shouldShowDotHelp({ remembered: null, recordDays: 10 })).toBe(false);
  });

  it('sin ningún punto en pantalla no hay nada que explicar (y no se gasta la única vez)', () => {
    expect(shouldShowDotHelp({ remembered: false, recordDays: 0 })).toBe(false);
  });

  it('el texto explica el punto y la leyenda queda corta', () => {
    expect(DOT_HELP_TEXT).toBe('El punto debajo de un día indica que registraste algo ese día.');
    expect(DOT_LEGEND).toBe('días con registros');
  });
});
