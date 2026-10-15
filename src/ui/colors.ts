/**
 * Paleta y colores por tema: TS puro, sin el require de las fuentes, para que
 * vitest (node) pueda medir el contraste (UX-02). tokens.ts lo re-exporta.
 */

export const palette = {
  /* Neutros cálidos: menos clínicos que un gris puro. */
  ink950: '#141418',
  ink900: '#1C1C21',
  ink800: '#26262D',
  ink700: '#3A3A44',
  ink600: '#55555F',
  /* UX-02 · el gris más claro que aún da 4,5:1 sobre ink100, el más oscuro de los fondos. */
  ink450: '#666670',
  ink500: '#73737E',
  ink400: '#9A9AA4',
  ink300: '#C2C2CA',
  ink200: '#E0E0E6',
  ink100: '#EFEFF3',
  ink50: '#F7F7FA',
  white: '#FFFFFF',

  /* Índigo: el color del producto. */
  brand700: '#3B3BA8',
  brand600: '#4A4AC4',
  brand500: '#5B5BE0',
  /* UX-03 · el tono medio de los segmentos: >=3:1 contra los tracks de las barras. */
  brand450: '#6C6CE8',
  brand400: '#7C7CEB',
  brand300: '#A5A5F4',
  brand200: '#CFCFFA',
  brand100: '#E8E8FD',

  /* Acentos de apoyo. Teal para lo compartido: distingue sin competir. */
  teal700: '#0E6F6B',
  teal600: '#12857F',
  teal500: '#199E96',
  teal300: '#7FD4CE',
  teal100: '#DDF3F1',

  /* Para montos negativos y avisos. Ámbar, nunca rojo (§15). */
  amber700: '#8A5A00',
  amber600: '#A86E00',
  amber500: '#C98A14',
  amber100: '#FCF0D8',
} as const;

type ThemeColors = {
  /* Fondos */
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;

  /* Texto */
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnBrand: string;

  /* Marca e interacción */
  brand: string;
  brandSoft: string;
  brandPressed: string;

  /* Lo compartido */
  shared: string;
  sharedSoft: string;

  /* Los tres segmentos del radar (§15) */
  spent: string;
  committed: string;
  /** Sin asignar se dibuja VACÍO: es lo que todavía no tiene destino. */
  unassignedTrack: string;
  /** N-08 · el exceso sobre los ingresos registrados. Sin alarma. */
  excess: string;

  /* Estados */
  skeleton: string;
  overlay: string;
};

const light: ThemeColors = {
  background: palette.ink50,
  surface: palette.white,
  surfaceRaised: palette.white,
  surfaceSunken: palette.ink100,
  border: palette.ink200,
  borderStrong: palette.ink300,

  text: palette.ink950,
  textSecondary: palette.ink600,
  /* UX-02 · ≥4,5:1 sobre fondo, blanco e ink100 (ink400 daba 2,4 a 2,8). */
  textMuted: palette.ink450,
  textOnBrand: palette.white,

  brand: palette.brand500,
  brandSoft: palette.brand100,
  brandPressed: palette.brand600,

  shared: palette.teal600,
  sharedSoft: palette.teal100,

  /* UX-03 · segmentos >=3:1 contra el track (ink200): Gastado el más intenso, Comprometido
     un tono medio. Entre ellos va la separación de 2px de RadarBar. */
  spent: palette.brand700,
  committed: palette.brand450,
  unassignedTrack: palette.ink200,
  /* UX-02 · se usa como TEXTO (N-08, errores): amber500 daba 2,75:1. Como marca de
     la barra sigue leyéndose (4,5:1 contra el track). Sigue siendo ámbar, no rojo (§15). */
  excess: palette.amber700,

  skeleton: palette.ink100,
  overlay: 'rgba(20, 20, 24, 0.45)',
};

const dark: ThemeColors = {
  background: palette.ink950,
  surface: palette.ink900,
  surfaceRaised: palette.ink800,
  surfaceSunken: palette.ink950,
  border: palette.ink800,
  borderStrong: palette.ink700,

  text: palette.ink50,
  textSecondary: palette.ink300,
  /* UX-02 · ≥4,5:1 sobre ink950 hasta ink800 (ink500 daba 3,2 a 3,9). */
  textMuted: palette.ink400,
  textOnBrand: palette.white,

  brand: palette.brand400,
  brandSoft: palette.ink800,
  brandPressed: palette.brand300,

  shared: palette.teal500,
  sharedSoft: palette.ink800,

  /* UX-03 · en oscuro lo más intenso es lo más claro: >=3:1 contra el track (ink800). */
  spent: palette.brand300,
  committed: palette.brand450,
  unassignedTrack: palette.ink800,
  excess: palette.amber500,

  skeleton: palette.ink800,
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const colorSchemes = { light, dark } as const;
export type ColorSchemeName = keyof typeof colorSchemes;
export type { ThemeColors };
