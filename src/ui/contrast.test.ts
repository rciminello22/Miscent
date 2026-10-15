import { describe, it, expect } from 'vitest';
import { colorSchemes, type ThemeColors } from './colors';

/**
 * UX-02 · contraste WCAG de los textos obligatorios.
 *
 * Las ayudas que moderan la lectura de la cifra grande (CA-01, N-08, "Ya
 * pasó") se dibujan en `textMuted` y `excess`. Si no se leen, "Sin asignar"
 * vuelve a parecer plata disponible. WCAG 2.x AA: 4,5:1 para texto normal.
 */

const AA = 4.5;

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Relación de contraste WCAG entre dos colores #RRGGBB. */
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Dónde se pinta texto de cada token, por tema. */
const SURFACES: Record<keyof typeof colorSchemes, (keyof ThemeColors)[]> = {
  // background: pantallas · surface: Card y barra de pestañas · surfaceSunken: Card "sunken"
  light: ['background', 'surface', 'surfaceSunken'],
  // En oscuro el fondo y el hundido comparten color; surfaceRaised es la más clara.
  dark: ['background', 'surface', 'surfaceRaised', 'surfaceSunken'],
};

const TEXT_TOKENS: (keyof ThemeColors)[] = ['textMuted', 'excess'];

describe('UX-02 · contraste mínimo 4,5:1 del texto de ayuda', () => {
  it('la función de contraste es la de WCAG (negro sobre blanco = 21:1)', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  for (const scheme of ['light', 'dark'] as const) {
    for (const token of TEXT_TOKENS) {
      for (const surface of SURFACES[scheme]) {
        it(`${scheme} · ${token} sobre ${surface}`, () => {
          const colors = colorSchemes[scheme];
          expect(contrast(colors[token], colors[surface])).toBeGreaterThanOrEqual(AA);
        });
      }
    }
  }
});

/**
 * UX-03 · WCAG 1.4.11 (objetos gráficos): 3:1 contra lo que tienen al lado.
 *
 * Comprometido contra el track vacío daba ~1,7:1 y Gastado contra Comprometido
 * ~3:1: "con destino" y "sin destino", la distinción central del radar, casi
 * se fundían. Dos segmentos del mismo matiz no pueden estar a 3:1 entre sí Y
 * a 3:1 del track, así que se distinguen por tono (esta prueba pide una
 * diferencia mínima) más 2px de separación del color del fondo (RadarBar).
 */
const GRAPHIC = 3;
/** Diferencia mínima de tono entre segmentos contiguos; la separación hace el resto. */
const SEGMENT_TONE_GAP = 1.8;

describe('UX-03 · contraste de los segmentos del radar (>= 3:1 contra el track)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const colors = colorSchemes[scheme];

    for (const segment of ['spent', 'committed'] as const) {
      it(`${scheme} · ${segment} contra el track vacío`, () => {
        expect(contrast(colors[segment], colors.unassignedTrack)).toBeGreaterThanOrEqual(GRAPHIC);
      });
    }

    it(`${scheme} · Gastado y Comprometido se distinguen por tono`, () => {
      expect(contrast(colors.spent, colors.committed)).toBeGreaterThanOrEqual(SEGMENT_TONE_GAP);
    });

    it(`${scheme} · la marca de exceso se ve contra la separación (surface)`, () => {
      expect(contrast(colors.excess, colors.surface)).toBeGreaterThanOrEqual(GRAPHIC);
    });
  }
});

describe('UX-03 · contraste de las barras por mes (MonthBar, >= 3:1 contra su track)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const colors = colorSchemes[scheme];

    // MonthBar pinta `committed` y, resaltada, `spent`, sobre `surfaceSunken`.
    for (const segment of ['spent', 'committed'] as const) {
      it(`${scheme} · ${segment} contra surfaceSunken`, () => {
        expect(contrast(colors[segment], colors.surfaceSunken)).toBeGreaterThanOrEqual(GRAPHIC);
      });
    }
  }
});
