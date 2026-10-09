import AsyncStorage from '@react-native-async-storage/async-storage';
import { encodeIntent, intentFor, type OnboardingIntent } from './authFlow';

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
 * Se guarda CON el email que lo pidió (authFlow.intentFor), y se borra en
 * cuanto entra CUALQUIER usuario, lo use o no.
 */

const KEY = 'radar.onboarding.intent';

export type { OnboardingIntent };

export async function rememberOnboardingIntent(
  email: string,
  intent: OnboardingIntent,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, encodeIntent(email, intent));
  } catch {
    // Si el almacenamiento falla, el usuario queda en Estado B y puede
    // activar su cuenta a mano. Degrada, no rompe.
  }
}

/** Invitación o "Ya tengo cuenta": ninguna elección previa tiene que sobrevivir. */
export async function forgetOnboardingIntent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nada que hacer: intentFor igual exige que el email coincida.
  }
}

/** La consume siempre; devuelve la elección solo si es de `sessionEmail`. */
export async function takeOnboardingIntent(
  sessionEmail: string | undefined,
): Promise<OnboardingIntent | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored != null) await AsyncStorage.removeItem(KEY);
    return intentFor(stored, sessionEmail);
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
