/**
 * Tokens de diseño.
 *
 * §33 · "Criterio estético: pantallas limpias, una forma visual por pregunta,
 * tipografía y espacio por sobre tablas densas. Nada que parezca un home
 * banking."
 *
 * Decisión de color que vale explicar, porque es semántica y no decorativa:
 * la barra del radar NO usa un semáforo. Lo que está asignado se dibuja
 * lleno y lo que está sin asignar se dibuja vacío. Así la barra se lee
 * sola: "esta parte de mis ingresos ya tiene destino, esta todavía no".
 *
 * Nada de rojo de alarma, tampoco en Sin asignar negativo (N-08): la app no
 * juzga al usuario.
 */

export const palette = {
  /* Neutros cálidos: menos clínicos que un gris puro. */
  ink950: '#141418',
  ink900: '#1C1C21',
  ink800: '#26262D',
  ink700: '#3A3A44',
  ink600: '#55555F',
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
  textMuted: palette.ink400,
  textOnBrand: palette.white,

  brand: palette.brand500,
  brandSoft: palette.brand100,
  brandPressed: palette.brand600,

  shared: palette.teal600,
  sharedSoft: palette.teal100,

  spent: palette.brand600,
  committed: palette.brand300,
  unassignedTrack: palette.ink200,
  excess: palette.amber500,

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
  textMuted: palette.ink500,
  textOnBrand: palette.white,

  brand: palette.brand400,
  brandSoft: palette.ink800,
  brandPressed: palette.brand300,

  shared: palette.teal500,
  sharedSoft: palette.ink800,

  spent: palette.brand400,
  committed: palette.brand700,
  unassignedTrack: palette.ink800,
  excess: palette.amber500,

  skeleton: palette.ink800,
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const colorSchemes = { light, dark } as const;
export type ColorSchemeName = keyof typeof colorSchemes;
export type { ThemeColors };

/** Escala de espaciado de 4pt. */
export const space = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 32,
  '8': 40,
  '9': 48,
  '10': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Tipografía. Inter variable.
 *
 * `tabular` es obligatorio en todo monto: sin ancho fijo de dígito, un número
 * que se anima de $320.000 a $350.000 hace saltar el texto de al lado.
 */
export const typography = {
  display: { fontFamily: 'Inter_600SemiBold', fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 23 },
  small: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  smallMedium: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  /** Para encabezados de sección: "PRÓXIMOS PAGOS". */
  overline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const fontsToLoad = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
};
