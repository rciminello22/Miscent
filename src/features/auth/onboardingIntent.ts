import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Qué eligió el usuario en O1 paso 2, guardado mientras va al mail y vuelve.
 *
 * Existe para resolver una regla puntual de §13:
 *
 *   O1 paso 5a · "Se activa la cuenta personal en los TRES casos, porque
 *                 crear un espacio la requiere [P5]."
 *   O2         · el invitado entra SIN cuenta personal (A-03, CA-05).
 *
 * Los dos flujos terminan en el mismo enlace mágico, así que al volver hay
 * que saber por cuál de los dos entró. Si no, un usuario que se registró solo
 * quedaría en Estado B sin espacios: una pantalla inútil.
 *
 * El flag se borra en cuanto se usa.
 */

const KEY = 'radar.onboarding.intent';

export type OnboardingIntent = 'personal' | 'shared' | 'both';

export async function rememberOnboardingIntent(intent: OnboardingIntent): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, intent);
  } catch {
    // Si el almacenamiento falla, el usuario queda en Estado B y puede
    // activar su cuenta a mano. Degrada, no rompe.
  }
}

export async function takeOnboardingIntent(): Promise<OnboardingIntent | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value == null) return null;
    await AsyncStorage.removeItem(KEY);
    return value === 'personal' || value === 'shared' || value === 'both' ? value : null;
  } catch {
    return null;
  }
}

/**
 * El nombre visible inicial, derivado del email.
 *
 * §13 O1 no pide el nombre, y con razón: cada campo del registro es una
 * oportunidad de abandono. El nombre importa recién cuando hay otra persona
 * que lo va a ver, así que se confirma al crear un espacio (§26) y se puede
 * cambiar desde Perfil.
 *
 * K7 · nunca se muestra el email al otro miembro, así que esto es solo un
 * punto de partida, no la identidad.
 */
export function displayNameFromEmail(email: string | undefined): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const cleaned = local.replace(/[._\-+]+/g, ' ').trim();
  if (cleaned === '') return 'Vos';

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
