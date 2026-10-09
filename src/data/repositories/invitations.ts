import * as Linking from 'expo-linking';
import { supabase } from '../supabase';

/**
 * Invitaciones. §26 · I-01 a I-07 · K6.
 *
 * El token viaja SOLO en el enlace: en la base queda su hash sha256. Así ni un
 * volcado de la base permite entrar a un espacio ajeno.
 *
 * Crear y aceptar van por RPC porque validan reglas que un cliente podría
 * saltearse: K6 (la nueva anula la anterior), I-05 (vencida, usada o anulada
 * no da acceso), P4 (dos usuarios no comparten más de un espacio activo) e
 * I-07 (aceptar no activa una cuenta personal).
 */

export type InvitationState = {
  status: 'active' | 'used' | 'expired' | 'revoked';
  expiresAt: string;
};

/** El enlace que el usuario comparte por donde quiera. La app no manda mensajes. */
export function invitationLink(token: string): string {
  return Linking.createURL(`/invite/${encodeURIComponent(token)}`);
}

/**
 * I-02 / K6 · genera una invitación de un solo uso, 7 días. La anterior queda
 * anulada. Devuelve el token en claro UNA vez.
 */
export async function createInvitation(spaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('app_create_invitation', {
    target_space_id: spaceId,
  });

  if (error != null) {
    throw new Error(
      error.message.includes('I-01')
        ? 'Este espacio ya tiene a sus dos miembros.'
        : 'No pudimos generar la invitación.',
    );
  }
  return data as string;
}

/** §26 · lo que ve el creador: "Invitación enviada · vence el 12/10". */
export async function fetchInvitationState(spaceId: string): Promise<InvitationState | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('status, expires_at')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error != null || data == null) return null;
  return { status: data.status, expiresAt: data.expires_at };
}

/** §26 · el creador puede anular una invitación activa. */
export async function revokeInvitation(spaceId: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('space_id', spaceId)
    .eq('status', 'active');

  if (error != null) throw new Error('No pudimos cancelar la invitación.');
}

export type AcceptResult =
  | { ok: true; spaceId: string }
  | { ok: false; reason: AcceptFailure; spaceName?: string };

export type AcceptFailure =
  | 'not-found'
  | 'expired'
  | 'used'
  | 'revoked'
  | 'slot-taken'
  | 'already-sharing'
  | 'unknown';

/**
 * I-04 a I-07 · aceptar. La RPC valida todo de forma atómica y devuelve el id
 * del espacio.
 *
 * Los mensajes de cada error son los de §33 U5, literales.
 */
export async function acceptInvitation(
  token: string,
  confirmedName?: string,
): Promise<AcceptResult> {
  // El argumento es opcional en la RPC: si no se manda, se usa el nombre que
  // el usuario ya tiene en su perfil (§26).
  const { data, error } = await supabase.rpc('app_accept_invitation', {
    raw_token: token,
    ...(confirmedName != null ? { confirmed_name: confirmedName } : {}),
  });

  if (error == null) return { ok: true, spaceId: data as string };

  const message = error.message;

  if (message.includes('ALREADY_SHARING')) {
    // P4 / I-06 · "Ya compartís Casa con Renzo".
    const spaceName = message.split('ALREADY_SHARING:')[1]?.trim() ?? undefined;
    return { ok: false, reason: 'already-sharing', spaceName };
  }
  if (message.includes('INVITATION_EXPIRED')) return { ok: false, reason: 'expired' };
  if (message.includes('INVITATION_USED')) return { ok: false, reason: 'used' };
  if (message.includes('INVITATION_REVOKED')) return { ok: false, reason: 'revoked' };
  if (message.includes('INVITATION_SLOT_TAKEN')) return { ok: false, reason: 'slot-taken' };
  if (message.includes('INVITATION_NOT_FOUND')) return { ok: false, reason: 'not-found' };

  return { ok: false, reason: 'unknown' };
}

/** §33 U5 · los mensajes de error, textuales. */
export function acceptFailureMessage(failure: AcceptFailure, spaceName?: string): string {
  switch (failure) {
    case 'expired':
      return 'Esta invitación venció. Pedile a quien te invitó que te mande una nueva.';
    case 'used':
      return 'Esta invitación ya se usó.';
    case 'revoked':
      return 'Esta invitación ya no sirve. Usá la última que te mandaron.';
    case 'slot-taken':
      return 'Este espacio ya tiene a sus dos miembros.';
    case 'already-sharing':
      return spaceName != null
        ? `Ya compartís ${spaceName} con esta persona.`
        : 'Ya compartís un espacio con esta persona.';
    case 'not-found':
      return 'Este enlace no es válido. Pedí uno nuevo.';
    default:
      return 'No pudimos abrir la invitación. Probá de nuevo en un momento.';
  }
}
