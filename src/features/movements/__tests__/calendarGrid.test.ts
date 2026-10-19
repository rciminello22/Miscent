import { describe, it, expect } from 'vitest';
import type { MovementRow } from '../buildMovementList';
import { buildMonthCalendar, emptyDayMessage, parseDayParam } from '../calendarGrid';

/**
 * La grilla del mes de Movimientos (§16): las semanas de lunes a domingo, qué
 * días tienen registros y qué dice el lector de pantalla. TS puro.
 * Cuenta REGISTROS, nunca plata (CA-00).
 */

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

const TODAY = '2026-10-15';
const rows = [
  row('a', '2026-10-14'),
  row('b', '2026-10-14'),
  row('c', '2026-10-15'),
  row('d', '2026-10-01'),
];

describe('buildMonthCalendar · las semanas de lunes a domingo', () => {
  const calendar = buildMonthCalendar({ month: '2026-10', today: TODAY, rows });

  it('la cabecera es L M M J V S D', () => {
    expect(calendar.weekdays).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  });

  it('el 1 de octubre de 2026 es jueves: tres huecos al principio', () => {
    const [first] = calendar.weeks;
    expect(first!.slice(0, 3)).toEqual([null, null, null]);
    expect(first![3]?.day).toBe(1);
  });

  it('cada semana tiene 7 casilleros, y el mes tiene todos sus días en orden', () => {
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true);
    const days = calendar.weeks.flat().flatMap((day) => (day == null ? [] : [day.day]));
    expect(days).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
    // 3 huecos + 31 días = 34 casilleros → 5 semanas, con 1 hueco al final.
    expect(calendar.weeks).toHaveLength(5);
    expect(calendar.weeks[4]![6]).toBeNull();
  });

  it('un mes que empieza en lunes no tiene huecos al principio', () => {
    // 1 de junio de 2026 es lunes.
    const june = buildMonthCalendar({ month: '2026-06', today: TODAY, rows: [] });
    expect(june.weeks[0]![0]?.day).toBe(1);
  });

  it('un mes que empieza en domingo tiene seis huecos', () => {
    // 1 de febrero de 2026 es domingo.
    const february = buildMonthCalendar({ month: '2026-02', today: TODAY, rows: [] });
    expect(february.weeks[0]!.slice(0, 6).every((slot) => slot === null)).toBe(true);
    expect(february.weeks[0]![6]?.day).toBe(1);
  });

  it('cuenta registros por día, nunca plata', () => {
    const byDay = (day: number) => calendar.weeks.flat().find((slot) => slot?.day === day)!;
    expect(byDay(14).count).toBe(2);
    expect(byDay(15).count).toBe(1);
    expect(byDay(9).count).toBe(0);
    expect(JSON.stringify(calendar)).not.toContain('4500');
  });

  it('marca hoy y los días que todavía no llegaron', () => {
    const byDay = (day: number) => calendar.weeks.flat().find((slot) => slot?.day === day)!;
    expect(byDay(15).isToday).toBe(true);
    expect(byDay(15).isFuture).toBe(false);
    expect(byDay(14).isFuture).toBe(false);
    expect(byDay(16).isFuture).toBe(true);
    expect(byDay(31).isFuture).toBe(true);
  });

  it('un mes que ya pasó queda completo: ningún día es futuro ni hoy', () => {
    const september = buildMonthCalendar({ month: '2026-09', today: TODAY, rows: [] });
    const all = september.weeks.flat().filter((slot) => slot != null);
    expect(all.every((day) => !day.isFuture && !day.isToday)).toBe(true);
  });

  it('cuenta los días con registros', () => {
    expect(calendar.recordDays).toBe(3);
  });
});

describe('buildMonthCalendar · lo que anuncia el lector de pantalla', () => {
  const calendar = buildMonthCalendar({ month: '2026-10', today: TODAY, rows });
  const labelOf = (day: number) => calendar.weeks.flat().find((slot) => slot?.day === day)!.label;

  it('un día con registros: el día, la fecha y cuántos', () => {
    expect(labelOf(14)).toBe('Miércoles 14 de octubre, 2 registros');
    expect(labelOf(1)).toBe('Jueves 1 de octubre, 1 registro');
  });

  it('un día sin registros lo dice', () => {
    expect(labelOf(9)).toBe('Viernes 9 de octubre, sin registros');
  });

  it('hoy lo dice', () => {
    expect(labelOf(15)).toBe('Jueves 15 de octubre, hoy, 1 registro');
  });

  it('un día futuro: todavía no llegó', () => {
    expect(labelOf(16)).toBe('Viernes 16 de octubre, todavía no llegó');
  });
});

describe('un día sin registros', () => {
  it('"No registraste nada el 9 de octubre."', () => {
    expect(emptyDayMessage('2026-10-09')).toBe('No registraste nada el 9 de octubre.');
  });
});

describe('el día en la ruta de la pestaña', () => {
  it('solo se acepta una fecha del mes que se está viendo', () => {
    expect(parseDayParam('2026-10-14', '2026-10')).toBe('2026-10-14');
    expect(parseDayParam('2026-09-30', '2026-10')).toBeNull();
    expect(parseDayParam('2026-10-32', '2026-10')).toBeNull();
    expect(parseDayParam('hola', '2026-10')).toBeNull();
    expect(parseDayParam(undefined, '2026-10')).toBeNull();
  });
});
