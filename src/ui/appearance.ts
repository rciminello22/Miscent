import type { ColorSchemeName } from './colors';

/**
 * Apariencia (Perfil · 10B). La preferencia es una de tres; el tema efectivo se
 * resuelve acá, en TS puro, y el ThemeProvider solo lo aplica.
 *
 *   auto  · sigue el ajuste del iPhone (valor de fábrica)
 *   light · siempre claro
 *   dark  · siempre oscuro
 */
export type AppearancePreference = 'auto' | 'light' | 'dark';

/** Dónde se guarda la elección en AsyncStorage. */
export const APPEARANCE_KEY = 'radar.apariencia';

/** El orden del control: Automático, Claro, Oscuro. */
export const APPEARANCE_OPTIONS: readonly { value: AppearancePreference; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

/** El esquema que se dibuja. Sin dato del sistema, claro. */
export function resolveScheme(
  preference: AppearancePreference,
  system: string | null | undefined,
): ColorSchemeName {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

/** Lo leído de AsyncStorage: lo ausente o corrupto vuelve a Automático. */
export function parseAppearance(raw: string | null): AppearancePreference {
  return raw === 'light' || raw === 'dark' ? raw : 'auto';
}

/** Tema oscuro, texto de la barra claro; y al revés. */
export function statusBarStyleFor(scheme: ColorSchemeName): 'light' | 'dark' {
  return scheme === 'dark' ? 'light' : 'dark';
}

/** La ayuda bajo "Apariencia". */
export function appearanceHelp(preference: AppearancePreference): string {
  if (preference === 'auto') return 'Automático sigue el ajuste del iPhone.';
  return preference === 'light' ? 'Claro, elegido por vos.' : 'Oscuro, elegido por vos.';
}
