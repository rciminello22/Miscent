/**
 * Mensajes de error de identidad, en el idioma del producto.
 *
 * §13 O1 paso 4 · "Enlace vencido: 'Pedí uno nuevo'". Nunca se muestra el
 * texto crudo del proveedor: el usuario no tiene que leer "OTP expired".
 */
export function describeAuthError(raw: string): string {
  const message = raw.toLowerCase();

  // O2 sin email (10/10): requiere "Anonymous sign-ins" en el dashboard.
  if (message.includes('anonymous sign-ins are disabled')) {
    return 'Todavía no se puede entrar sin email. Avisale a quien te invitó.';
  }
  // "Guardá tu acceso" con un email que ya es de otra cuenta.
  if (message.includes('already been registered') || message.includes('already registered')) {
    return 'Ese email ya tiene una cuenta. Usá otro, o entrá con ese desde la bienvenida.';
  }

  // "Ya tengo cuenta" pide el enlace SIN crear usuario (shouldCreateUser:
  // false). Si el email no existe, el proveedor lo rechaza así.
  if (message.includes('signups not allowed') || message.includes('user not found')) {
    return 'No encontramos una cuenta con ese email. Si es tu primera vez, tocá Empezar.';
  }
  if (message.includes('expired') || message.includes('invalid')) {
    return 'El código venció o no es correcto. Pedí uno nuevo.';
  }
  if (
    message.includes('rate') ||
    message.includes('too many') ||
    message.includes('only request this after')
  ) {
    return 'Pedimos varios seguidos. Esperá un minuto y probá otra vez.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.';
  }
  return 'No pudimos entrar. Probá de nuevo en un momento.';
}

/** El código del mail: 8 dígitos (otp_length). Se pega como venga. */
export const OTP_LENGTH = 8;

export function normalizeOtp(input: string): string {
  return input.replace(/\D/g, '').slice(0, OTP_LENGTH);
}
