/**
 * El id de un registro nuevo lo genera la app, UNA vez por formulario.
 *
 * Es lo que vuelve idempotente un alta (H-01, H-12, H-13, H-14): si la red
 * corta después de que la base guardó, o la persona toca Guardar dos veces,
 * el reintento manda el MISMO id y pisa la misma fila en vez de crear otra.
 * Dos gastos legítimos iguales tienen ids distintos: nada impide cargarlos.
 *
 * No es un secreto: alcanza con que no se repita. Usa `crypto` cuando el
 * motor de JS lo trae y, si no, `Math.random` (122 bits al azar igual).
 */

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

export function newId(): string {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof crypto?.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  }
  // RFC 4122 · versión 4, variante 10xx.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
