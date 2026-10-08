import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Identidad. A-01 / P1 / CA-49 · "Registro e inicio de sesión por email con
 * enlace mágico, sin contraseña."
 *
 * No hay formulario de contraseña en ninguna parte de la app. No es una
 * simplificación: es la decisión P1, y además saca de encima toda la
 * superficie de recuperación de contraseñas, que para un piloto de dos meses
 * es complejidad pura.
 */

export type MagicLinkResult =
  | { status: 'sent' }
  | { status: 'error'; message: string };

/** La URL a la que vuelve el enlace. Funciona en dev (exp://) y en build. */
export function authRedirectUrl(): string {
  return Linking.createURL('/auth/callback');
}

/**
 * O1 paso 4 / O2 paso 3 · "Te mandamos un enlace a tu email para entrar."
 *
 * El mismo flujo sirve para registrarse y para volver a entrar: el usuario no
 * tiene que saber en cuál de los dos está.
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResult> {
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: authRedirectUrl(),
      shouldCreateUser: true,
    },
  });

  if (error != null) {
    return { status: 'error', message: describeAuthError(error.message) };
  }
  return { status: 'sent' };
}

/**
 * Cierra el enlace mágico: toma los tokens del deep link y establece la
 * sesión. `detectSessionInUrl` está apagado porque en React Native no hay una
 * URL de navegador que el SDK pueda leer solo.
 */
export async function completeMagicLink(url: string): Promise<{ ok: boolean; message?: string }> {
  const parsed = Linking.parse(url);
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const fragmentParams = new URLSearchParams(fragment);

  const accessToken =
    fragmentParams.get('access_token') ?? asString(parsed.queryParams?.access_token);
  const refreshToken =
    fragmentParams.get('refresh_token') ?? asString(parsed.queryParams?.refresh_token);

  if (accessToken != null && refreshToken != null) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error == null ? { ok: true } : { ok: false, message: describeAuthError(error.message) };
  }

  // Flujo PKCE: el enlace trae un code que se canjea.
  const code = fragmentParams.get('code') ?? asString(parsed.queryParams?.code);
  if (code != null) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error == null ? { ok: true } : { ok: false, message: describeAuthError(error.message) };
  }

  const errorDescription =
    fragmentParams.get('error_description') ?? asString(parsed.queryParams?.error_description);

  return {
    ok: false,
    message: errorDescription != null ? describeAuthError(errorDescription) : undefined,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Mensajes de error en el idioma del producto.
 *
 * §13 O1 paso 4 · "Enlace vencido: 'Pedí uno nuevo'". Nunca se muestra el
 * texto crudo del proveedor: el usuario no tiene que leer "OTP expired".
 */
function describeAuthError(raw: string): string {
  const message = raw.toLowerCase();

  if (message.includes('expired')) {
    return 'El enlace venció. Pedí uno nuevo.';
  }
  if (message.includes('invalid') || message.includes('not found')) {
    return 'Este enlace ya no sirve. Pedí uno nuevo.';
  }
  if (message.includes('rate') || message.includes('too many')) {
    return 'Pedimos varios enlaces seguidos. Esperá un minuto y probá otra vez.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.';
  }
  return 'No pudimos entrar. Probá de nuevo en un momento.';
}
