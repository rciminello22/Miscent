import { describe, it, expect } from 'vitest';
import {
  APPROX_PRESETS,
  answerFromStored,
  approxNote,
  chooseMode,
  chooseDay,
  dayAnswerToStored,
  emptyAnswer,
  incomeDayPhrase,
  isAnswered,
} from './dayAnswer';

/**
 * T-02 · T-05 · "Sé el día", "Más o menos" y "No sé": el mismo patrón para el
 * cierre y el vencimiento de una tarjeta y el día de cobro de un ingreso.
 *
 * Qué se guarda: "Sé el día" el día elegido; "Más o menos" 2, 15 o 28 marcado
 * como aproximado; "No sé" sin día. Nadie queda con un día que no eligió.
 */

describe('lo que se guarda de cada respuesta', () => {
  it('"Sé el día": el día elegido, sin marca', () => {
    const answer = chooseDay(chooseMode(emptyAnswer(), 'exact'), 5);

    expect(dayAnswerToStored(answer)).toEqual({ day: 5, approx: false });
  });

  it('"Más o menos": Principio es el 2, Mediados el 15 y Fin de mes el 28, con la marca', () => {
    expect(APPROX_PRESETS.map((preset) => [preset.label, preset.day])).toEqual([
      ['Principio', 2],
      ['Mediados', 15],
      ['Fin de mes', 28],
    ]);

    const answer = chooseDay(chooseMode(emptyAnswer(), 'approx'), 15);
    expect(dayAnswerToStored(answer)).toEqual({ day: 15, approx: true });
  });

  it('"No sé": sin día y sin marca (T-05)', () => {
    expect(dayAnswerToStored(chooseMode(emptyAnswer(), 'unknown'))).toEqual({
      day: null,
      approx: false,
    });
  });

  it('sin responder nada: sin día. Nadie queda con un día que no eligió', () => {
    expect(dayAnswerToStored(emptyAnswer())).toEqual({ day: null, approx: false });
  });

  it('"Sé el día" o "Más o menos" sin elegir todavía el día: sin día y sin marca', () => {
    expect(dayAnswerToStored(chooseMode(emptyAnswer(), 'exact'))).toEqual({ day: null, approx: false });
    expect(dayAnswerToStored(chooseMode(emptyAnswer(), 'approx'))).toEqual({ day: null, approx: false });
  });

  it('un día que no es Principio, Mediados ni Fin de mes no se acepta en "Más o menos"', () => {
    const answer = chooseDay(chooseMode(emptyAnswer(), 'approx'), 9);

    expect(dayAnswerToStored(answer)).toEqual({ day: null, approx: false });
  });
});

describe('cambiar de respuesta', () => {
  it('pasar de "Sé el día" a "No sé" descarta el día', () => {
    const exact = chooseDay(chooseMode(emptyAnswer(), 'exact'), 20);
    const unknown = chooseMode(exact, 'unknown');

    expect(unknown).toEqual({ mode: 'unknown', day: null });
  });

  it('pasar de un modo a otro no arrastra el día anterior', () => {
    const exact = chooseDay(chooseMode(emptyAnswer(), 'exact'), 15);

    expect(chooseMode(exact, 'approx').day).toBeNull();
  });

  it('volver a tocar el mismo modo conserva lo elegido', () => {
    const exact = chooseDay(chooseMode(emptyAnswer(), 'exact'), 20);

    expect(chooseMode(exact, 'exact')).toEqual(exact);
  });
});

describe('isAnswered', () => {
  it('"No sé" es una respuesta; un modo sin día todavía no', () => {
    expect(isAnswered(emptyAnswer())).toBe(false);
    expect(isAnswered(chooseMode(emptyAnswer(), 'exact'))).toBe(false);
    expect(isAnswered(chooseMode(emptyAnswer(), 'unknown'))).toBe(true);
    expect(isAnswered(chooseDay(chooseMode(emptyAnswer(), 'exact'), 5))).toBe(true);
  });
});

describe('answerFromStored · abrir lo ya guardado', () => {
  it('un día exacto', () => {
    expect(answerFromStored({ day: 5, approx: false })).toEqual({ mode: 'exact', day: 5 });
  });

  it('un día aproximado', () => {
    expect(answerFromStored({ day: 28, approx: true })).toEqual({ mode: 'approx', day: 28 });
  });

  it('sin día es "No sé"', () => {
    expect(answerFromStored({ day: null, approx: false })).toEqual({ mode: 'unknown', day: null });
  });

  it('"Ya sé el día exacto": abre el selector con "Sé el día", conservando el día como punto de partida', () => {
    const answer = answerFromStored({ day: 28, approx: true }, { knowExactDay: true });

    expect(answer).toEqual({ mode: 'exact', day: null });
  });
});

describe('approxNote', () => {
  it('dice qué se guardó, y que es aproximado', () => {
    expect(approxNote(15)).toBe('Guardamos el 15, marcado como aproximado.');
    expect(approxNote(2)).toBe('Guardamos el 2, marcado como aproximado.');
  });

  it('sin día elegido, no dice nada', () => {
    expect(approxNote(null)).toBeNull();
  });
});

describe('incomeDayPhrase · Perfil > Ingresos y el detalle del ingreso', () => {
  it('un día exacto', () => {
    expect(incomeDayPhrase({ day: 5, approx: false })).toBe('cada día 5');
  });

  it('un día aproximado: "cada ~28 · aprox."', () => {
    expect(incomeDayPhrase({ day: 28, approx: true })).toBe('cada ~28 · aprox.');
  });

  it('"No sé": se cuenta en el mes, sin día', () => {
    expect(incomeDayPhrase({ day: null, approx: false })).toBe('sin día');
  });
});
