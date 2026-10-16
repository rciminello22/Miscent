import { describe, it, expect } from 'vitest';
import {
  MAX_REMEMBERED_SPACES,
  decodeOpenTimes,
  encodeOpenTimes,
  recordOpen,
} from './spaceOpenTimes';

/**
 * 3ii · el último momento en que se abrió cada espacio, guardado en el
 * dispositivo. Un dato de comodidad: si falta o está roto, la lista se ordena
 * por nombre y nada se rompe.
 */

describe('decodeOpenTimes', () => {
  it('sin nada guardado, vacío', () => {
    expect(decodeOpenTimes(null)).toEqual({});
  });

  it('lo que se guardó, de ida y vuelta', () => {
    const times = { casa: 1_700_000_000_000, auto: 1_700_000_500_000 };

    expect(decodeOpenTimes(encodeOpenTimes(times))).toEqual(times);
  });

  it('un texto roto no tira: vacío', () => {
    expect(decodeOpenTimes('{no es json')).toEqual({});
    expect(decodeOpenTimes('')).toEqual({});
  });

  it('algo que no es un mapa de números se descarta', () => {
    expect(decodeOpenTimes('[1,2,3]')).toEqual({});
    expect(decodeOpenTimes('"casa"')).toEqual({});
    expect(decodeOpenTimes('null')).toEqual({});
  });

  it('las entradas inválidas se saltean y las buenas se conservan', () => {
    expect(decodeOpenTimes('{"casa":100,"auto":"ayer","viaje":null,"x":-5,"y":1e999}')).toEqual({
      casa: 100,
    });
  });
});

describe('recordOpen', () => {
  it('anota el momento de apertura', () => {
    expect(recordOpen({}, 'casa', 500)).toEqual({ casa: 500 });
  });

  it('abrir de nuevo pisa el anterior y no toca los otros', () => {
    expect(recordOpen({ casa: 100, auto: 200 }, 'casa', 900)).toEqual({ casa: 900, auto: 200 });
  });

  it('no modifica lo que recibe', () => {
    const before = { casa: 100 };
    recordOpen(before, 'auto', 5);

    expect(before).toEqual({ casa: 100 });
  });

  it('no guarda para siempre: conserva los más recientes', () => {
    let times = {};
    for (let index = 0; index < MAX_REMEMBERED_SPACES + 10; index++) {
      times = recordOpen(times, `espacio-${index}`, 1_000 + index);
    }

    const ids = Object.keys(times);
    expect(ids).toHaveLength(MAX_REMEMBERED_SPACES);
    // Se fueron los más viejos, no los últimos.
    expect(ids).toContain(`espacio-${MAX_REMEMBERED_SPACES + 9}`);
    expect(ids).not.toContain('espacio-0');
  });
});
