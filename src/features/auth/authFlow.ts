/**
 * Las dos reglas de identidad que se rompieron el 9/10, como funciones puras
 * (TS sin React ni AsyncStorage: se testean en node).
 */

export type OnboardingIntent = 'personal' | 'shared' | 'both';

export type AccountState = 'loading' | 'signed-out' | 'guest' | 'personal';

const INTENTS: readonly string[] = ['personal', 'shared', 'both'];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * §13 O1 paso 5a · lo que eligió alguien en "Empezar", guardado mientras va
 * al mail. Se guarda CON el email que lo pidió.
 */
export function encodeIntent(email: string, intent: OnboardingIntent): string {
  return JSON.stringify({ email: normalizeEmail(email), intent });
}

/**
 * A-03 / CA-05 · la elección solo vale para el email que la pidió.
 *
 * Antes se guardaba suelta: si Renzo, que ya tenía cuenta, pasaba por
 * "Empezar", su elección quedaba en el teléfono y la heredaba el próximo
 * usuario nuevo. Así una invitada entró con cuenta personal.
 *
 * Ante cualquier duda (formato viejo, basura, sesión sin email) la respuesta
 * es null: sin cuenta personal. Una cuenta personal nunca se crea por
 * descarte.
 */
export function intentFor(stored: string | null, sessionEmail: string | undefined): OnboardingIntent | null {
  if (stored == null || sessionEmail == null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed == null) return null;
  const { email, intent } = parsed as { email?: unknown; intent?: unknown };

  if (typeof email !== 'string' || typeof intent !== 'string') return null;
  if (!INTENTS.includes(intent)) return null;
  if (normalizeEmail(email) !== normalizeEmail(sessionEmail)) return null;

  return intent as OnboardingIntent;
}

/**
 * §14 · qué árbol de navegación ve el usuario.
 *
 * Con sesión y el perfil todavía en camino es 'loading', no 'guest': en ese
 * instante la app no sabe si tiene cuenta personal, y cualquier pantalla que
 * redirigiera ahí mandaba al usuario a la vista del invitado.
 */
export function deriveAccountState(args: {
  sessionLoading: boolean;
  hasSession: boolean;
  profileLoading: boolean;
  profile: { hasPersonalAccount: boolean } | null;
}): AccountState {
  if (args.sessionLoading) return 'loading';
  if (!args.hasSession) return 'signed-out';
  if (args.profileLoading) return 'loading';
  return args.profile?.hasPersonalAccount === true ? 'personal' : 'guest';
}
