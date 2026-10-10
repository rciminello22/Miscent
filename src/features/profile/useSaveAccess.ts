import { useState } from 'react';
import { confirmSavingAccess, startSavingAccess } from '@/data/auth';
import { normalizeOtp, OTP_LENGTH } from '@/data/authErrors';

/**
 * "Guardá tu acceso" · vincular un email a quien entró por una invitación sin
 * email (10/10). Dos pasos: el email, y el código que llega a ese email.
 *
 * Lo usan la tarjeta del Perfil y el flujo guiado hacia la cuenta personal:
 * una sola lógica, dos formas de mostrarla.
 */
export function useSaveAccess(onSaved?: () => void) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const codeComplete = code.length === OTP_LENGTH;

  async function sendCode() {
    if (!emailLooksValid || busy) return;
    setBusy(true);
    setError(null);
    const result = await startSavingAccess(email);
    setBusy(false);
    if (result.ok) setStep('code');
    else setError(result.message);
  }

  async function confirm(value = code) {
    if (value.length !== OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const result = await confirmSavingAccess(email, value);
    setBusy(false);
    // Si sale bien, la sesión se renueva sola (USER_UPDATED) y deja de ser
    // anónima: quien la use decide a dónde sigue.
    if (result.ok) onSaved?.();
    else setError(result.message);
  }

  return {
    step,
    email,
    code,
    busy,
    error,
    emailLooksValid,
    codeComplete,
    normalizedEmail: email.trim().toLowerCase(),
    setEmail: (next: string) => {
      setEmail(next);
      setError(null);
    },
    /** Se envía solo al completar los 8 dígitos. */
    setCode: (input: string) => {
      const next = normalizeOtp(input);
      setCode(next);
      setError(null);
      if (next.length === OTP_LENGTH) void confirm(next);
    },
    sendCode,
    confirm: () => confirm(),
    backToEmail: () => {
      setStep('email');
      setCode('');
      setError(null);
    },
  };
}
