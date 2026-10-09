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
