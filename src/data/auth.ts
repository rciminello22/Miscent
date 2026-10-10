import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { describeAuthError } from './authErrors';

/**
 * Identidad. A-01 / P1 / CA-49 · "Registro e inicio de sesión por email con
 * enlace mágico, sin contraseña." Desde el 9/10, en testeo, el mismo mail trae
 * además un código de 8 dígitos (verifyEmailCode).
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
export async function sendMagicLink(
  email: string,
  options: { createUser: boolean },
): Promise<MagicLinkResult> {
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: authRedirectUrl(),
      // "Ya tengo cuenta" pide el enlace SIN crear usuario: una cuenta nueva
      // solo nace por "Empezar" o por una invitación, nunca por accidente.
      shouldCreateUser: options.createUser,
    },
  });

  if (error != null) {
    return { status: 'error', message: describeAuthError(error.message) };
  }
  return { status: 'sent' };
}

/**
 * El código de 8 dígitos del mismo mail. Decisión del 9/10 para la etapa de
 * testeo (revisar antes de producción): entra sin depender de que el enlace
 * se abra bien. `type: 'email'` sirve tanto para un registro nuevo como para
 * un usuario que vuelve.
 */
export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: 'email',
  });

  return error == null ? { ok: true } : { ok: false, message: describeAuthError(error.message) };
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

/**
 * O2 sin email (decisión del 10/10, revisar antes de producción): la invitada
 * entra como usuario anónimo. Es un usuario real, con su lugar, su autoría y
 * su RLS; lo que no tiene es cómo volver a entrar hasta que guarde su email.
 */
export async function signInAsGuest(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.signInAnonymously();
  return error == null ? { ok: true } : { ok: false, message: describeAuthError(error.message) };
}

/**
 * "Guardá tu acceso": vincula un email a un usuario anónimo, sin perder nada.
 * Supabase manda un código al email nuevo (plantilla "Change email address").
 */
export async function startSavingAccess(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
  return error == null ? { ok: true } : { ok: false, message: describeAuthError(error.message) };
}

export async function confirmSavingAccess(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: 'email_change',
  });
  return error == null ? { ok: true } : { ok: false, message: describeAuthError(error.message) };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
