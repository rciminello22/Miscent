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

export * from './colors';

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
