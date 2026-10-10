/**
 * Saca el token de lo que el invitado pegó en "Tengo una invitación".
 *
 * Acepta el enlace de cualquier esquema (exp://, radar://, https://), el
 * mensaje entero que se compartió o el token solo. Lo que no tiene forma de
 * token devuelve null: no se adivina.
 *
 * TS puro, sin expo-linking: se testea en node.
 */

// app_create_invitation: 32 bytes en base64 con + → - y / → _ (y su "=").
const TOKEN_RE = /^[A-Za-z0-9_-]{20,}={0,2}$/;
const IN_LINK_RE = /invite\/([^\s?#]+)/;

export function parseInvitationToken(input: string): string | null {
  const text = input.trim();
  if (text === '') return null;

  const candidate = decodeFully(IN_LINK_RE.exec(text)?.[1] ?? text);

  return candidate != null && TOKEN_RE.test(candidate) ? candidate : null;
}

/**
 * La invitación que espera a que exista el usuario, con el nombre que eligió
 * la invitada. Desde el 10/10 la invitada entra sin email (usuario anónimo):
 * el perfil no tiene de dónde sacar un nombre y la aceptación usaría "Vos".
 */
export function encodePendingInvitation(token: string, name: string): string {
  const trimmed = name.trim();
  return JSON.stringify({ token, name: trimmed === '' ? null : trimmed });
}

export function decodePendingInvitation(
  stored: string | null,
): { token: string; name: string | null } | null {
  if (stored == null || stored === '') return null;

  // Formato viejo: el token suelto, sin nombre.
  if (!stored.startsWith('{')) return { token: stored, name: null };

  try {
    const parsed = JSON.parse(stored) as { token?: unknown; name?: unknown };
    if (typeof parsed.token !== 'string' || parsed.token === '') return null;
    return { token: parsed.token, name: typeof parsed.name === 'string' ? parsed.name : null };
  } catch {
    return null;
  }
}

/**
 * Decodifica hasta que el texto deja de cambiar. Los enlaces generados antes
 * de corregir invitationLink venían codificados DOS veces ("=" → %3D →
 * %253D), y algunos ya se compartieron: tienen que seguir sirviendo.
 */
function decodeFully(value: string): string | null {
  let current = value;
  for (let pass = 0; pass < 3; pass += 1) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (next === current) return current;
    current = next;
  }
  return current;
}
