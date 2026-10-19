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

// UX-13 · `danger` también se pinta como TEXTO (errores y acciones destructivas).
const TEXT_TOKENS: (keyof ThemeColors)[] = ['textMuted', 'excess', 'danger'];

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
 * UX-13 · `excess` tenía tres significados (N-08, errores, destructivo). Ahora
 * `danger` es SOLO de errores y de lo destructivo, y `excess` queda para N-08 y la
 * marca de exceso de la barra. Que sean tokens distintos es el punto.
 */
function hue(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return (h * 60 + 360) % 360;
}

describe('UX-13 · danger y excess son tokens distintos', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const colors = colorSchemes[scheme];

    it(`${scheme} · danger no es excess`, () => {
      expect(colors.danger).not.toBe(colors.excess);
    });

    it(`${scheme} · danger es rojo (matiz < 20° o > 340°) y excess sigue siendo ámbar (30° a 50°)`, () => {
      const dangerHue = hue(colors.danger);
      expect(dangerHue < 20 || dangerHue > 340).toBe(true);

      const excessHue = hue(colors.excess);
      expect(excessHue).toBeGreaterThanOrEqual(30);
      expect(excessHue).toBeLessThanOrEqual(50);
    });

    it(`${scheme} · danger se distingue del ámbar por el matiz, no solo por el brillo`, () => {
      expect(Math.abs(hue(colors.excess) - hue(colors.danger))).toBeGreaterThanOrEqual(20);
    });
  }
});

describe('UX-13 · el aviso de error (Toast) tiene la superficie invertida', () => {
  // La superficie del Toast es `text` del tema actual; su marca usa el `danger` del otro.
  const pairs = [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const;

  for (const [scheme, other] of pairs) {
    it(`${scheme} · el danger de ${other} se lee sobre el aviso (>= 4,5:1)`, () => {
      expect(contrast(colorSchemes[other].danger, colorSchemes[scheme].text)).toBeGreaterThanOrEqual(AA);
    });
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

/**
 * Decisión 1A · el exceso como recipiente. Todo el N1 de Inicio es un panel
 * `brandSoft`: ahí van la etiqueta "$35.000 de más" (ámbar), el pie "Tus
 * ingresos registrados", el contorno del recipiente y el contorno y el rayado
 * del tramo de más. Texto 4,5:1; gráficos 3:1 (WCAG 1.4.11).
 */
describe('Decisión 1A · el recipiente del exceso sobre el panel (brandSoft)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const colors = colorSchemes[scheme];

    for (const token of ['excess', 'textSecondary', 'textMuted'] as const) {
      it(`${scheme} · el texto ${token} se lee sobre brandSoft (>= 4,5:1)`, () => {
        expect(contrast(colors[token], colors.brandSoft)).toBeGreaterThanOrEqual(AA);
      });
    }

    for (const token of ['excess', 'textMuted'] as const) {
      it(`${scheme} · el contorno ${token} se ve sobre brandSoft (>= 3:1)`, () => {
        expect(contrast(colors[token], colors.brandSoft)).toBeGreaterThanOrEqual(GRAPHIC);
      });
    }
  }
});

/**
 * 15 · la regla de signos: lo que entra se pinta en `brand` como TEXTO. Medido
 * sobre cada fondo donde aparece:
 *   - la fila de una lista y el detalle (cifra grande, 34pt): background
 *   - una Card y la hoja (Sheet): surface
 *   - el panel de un ingreso fijo (cifra grande): brandSoft
 *   - el recuadro teal de lo compartido: sharedSoft
 *
 * Texto normal: 4,5:1. Texto grande (>= 24pt, la cifra `display` de 34pt):
 * 3:1 (WCAG 1.4.3). Las filas usan 16pt, así que van por 4,5.
 */
const LARGE_TEXT = 3;

describe('15 · el "+" en brand como texto de una fila (4,5:1)', () => {
  const rowSurfaces: Record<keyof typeof colorSchemes, (keyof ThemeColors)[]> = {
    light: ['background', 'surface', 'surfaceSunken'],
    dark: ['background', 'surface', 'surfaceSunken'],
  };

  for (const scheme of ['light', 'dark'] as const) {
    for (const surface of rowSurfaces[scheme]) {
      it(`${scheme} · brand sobre ${surface}`, () => {
        const colors = colorSchemes[scheme];
        expect(contrast(colors.brand, colors[surface])).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});

describe('15 · el "+" en brand como cifra grande (>= 24pt, 3:1)', () => {
  const bigSurfaces: (keyof ThemeColors)[] = [
    'background',
    'surface',
    'surfaceRaised',
    'surfaceSunken',
    'brandSoft',
    'sharedSoft',
  ];

  for (const scheme of ['light', 'dark'] as const) {
    for (const surface of bigSurfaces) {
      it(`${scheme} · brand sobre ${surface}`, () => {
        const colors = colorSchemes[scheme];
        expect(contrast(colors.brand, colors[surface])).toBeGreaterThanOrEqual(LARGE_TEXT);
      });
    }
  }
});

describe('15 · el ⇄ de un pago entre miembros: `shared` sobre su recuadro (gráfico, 3:1)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`${scheme} · shared sobre sharedSoft`, () => {
      const colors = colorSchemes[scheme];
      expect(contrast(colors.shared, colors.sharedSoft)).toBeGreaterThanOrEqual(GRAPHIC);
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
