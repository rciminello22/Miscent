import { describe, it, expect } from 'vitest';
import { describeAuthError, normalizeOtp } from './authErrors';

/**
 * §13 O1 paso 4 · nunca se muestra el texto crudo del proveedor: el usuario no
 * tiene que leer "OTP expired".
 */
describe('describeAuthError', () => {
  it('"Ya tengo cuenta" con un email que no existe: lo dice, y no crea nada', () => {
    expect(describeAuthError('Signups not allowed for otp')).toBe(
      'No encontramos una cuenta con ese email. Si es tu primera vez, tocá Empezar.',
    );
  });

  it('código o enlace vencido', () => {
    expect(describeAuthError('Token has expired or is invalid')).toBe(
      'El código venció o no es correcto. Pedí uno nuevo.',
    );
    expect(describeAuthError('Email link is invalid or has expired')).toBe(
      'El código venció o no es correcto. Pedí uno nuevo.',
    );
  });

  it('rate limit', () => {
    expect(describeAuthError('For security purposes, you can only request this after 52 seconds.')).toBe(
      'Pedimos varios seguidos. Esperá un minuto y probá otra vez.',
    );
    expect(describeAuthError('email rate limit exceeded')).toBe(
      'Pedimos varios seguidos. Esperá un minuto y probá otra vez.',
    );
  });

  it('red', () => {
    expect(describeAuthError('Network request failed')).toBe(
      'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
    );
  });

  it('lo demás, sin texto crudo', () => {
    expect(describeAuthError('Database error saving new user')).toBe(
      'No pudimos entrar. Probá de nuevo en un momento.',
    );
  });
});

describe('normalizeOtp · el código de 8 dígitos', () => {
  it('se queda con los dígitos, aunque se pegue con espacios o guiones', () => {
    expect(normalizeOtp(' 1234 5678 ')).toBe('12345678');
    expect(normalizeOtp('1234-5678')).toBe('12345678');
  });

  it('nunca más de 8', () => {
    expect(normalizeOtp('123456789')).toBe('12345678');
  });
});
