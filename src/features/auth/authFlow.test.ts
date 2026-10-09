import { describe, it, expect } from 'vitest';
import { deriveAccountState, encodeIntent, intentFor } from './authFlow';

/**
 * El 9/10, probando dos cuentas en un teléfono, una invitada (Martina) entró
 * con cuenta personal: heredó la elección que había dejado guardada Renzo.
 * A-03 / CA-05 · "aceptar una invitación nunca activa una cuenta personal".
 */
describe('intentFor · la elección de "Empezar" es de un email', () => {
  it('vale para el mismo email que la pidió', () => {
    expect(intentFor(encodeIntent('renzo@gmail.com', 'both'), 'renzo@gmail.com')).toBe('both');
  });

  it('no compara mayúsculas ni espacios', () => {
    expect(intentFor(encodeIntent(' Renzo@Gmail.com ', 'personal'), 'renzo@gmail.com')).toBe(
      'personal',
    );
  });

  it('el bug del 9/10: otro email NO la hereda', () => {
    const queDejoRenzo = encodeIntent('ciminellorenzo@gmail.com', 'both');
    expect(intentFor(queDejoRenzo, 'ciminellorenzo+martina@gmail.com')).toBeNull();
  });

  it('el formato viejo (sin email) no se le atribuye a nadie', () => {
    expect(intentFor('both', 'renzo@gmail.com')).toBeNull();
  });

  it('nada guardado, basura o sesión sin email: sin cuenta personal', () => {
    expect(intentFor(null, 'renzo@gmail.com')).toBeNull();
    expect(intentFor('{roto', 'renzo@gmail.com')).toBeNull();
    expect(intentFor(encodeIntent('renzo@gmail.com', 'both'), undefined)).toBeNull();
    expect(intentFor(JSON.stringify({ email: 'renzo@gmail.com', intent: 'admin' }), 'renzo@gmail.com')).toBeNull();
  });
});

/**
 * Entre la sesión y el perfil hay un instante en que la app no sabe si el
 * usuario tiene cuenta personal. Antes ese instante valía 'guest', y una
 * pantalla que redirigía ahí mandaba a cualquiera a la vista del invitado.
 */
describe('deriveAccountState', () => {
  const profile = (hasPersonalAccount: boolean) => ({ hasPersonalAccount });

  it('sin sesión todavía resuelta: cargando', () => {
    expect(deriveAccountState({ sessionLoading: true, hasSession: false, profileLoading: false, profile: null })).toBe('loading');
  });

  it('sin sesión: afuera', () => {
    expect(deriveAccountState({ sessionLoading: false, hasSession: false, profileLoading: false, profile: null })).toBe('signed-out');
  });

  it('con sesión y el perfil en camino: cargando, NUNCA invitado', () => {
    expect(deriveAccountState({ sessionLoading: false, hasSession: true, profileLoading: true, profile: null })).toBe('loading');
  });

  it('con perfil: personal o invitado según la cuenta', () => {
    expect(deriveAccountState({ sessionLoading: false, hasSession: true, profileLoading: false, profile: profile(true) })).toBe('personal');
    expect(deriveAccountState({ sessionLoading: false, hasSession: true, profileLoading: false, profile: profile(false) })).toBe('guest');
  });

  it('si el perfil no se pudo cargar, no se inventa una cuenta personal', () => {
    expect(deriveAccountState({ sessionLoading: false, hasSession: true, profileLoading: false, profile: null })).toBe('guest');
  });
});
