import { describe, it, expect } from 'vitest';
import {
  decodePendingInvitation,
  encodePendingInvitation,
  parseInvitationToken,
} from './invitationLink';

/**
 * La invitación que espera a que exista el usuario (anónimo desde el 10/10),
 * con el nombre que eligió la invitada: sin email, el perfil no tiene de
 * dónde sacarlo, y la aceptación usaría "Vos".
 */
describe('invitación pendiente', () => {
  it('viaja con el nombre elegido', () => {
    expect(decodePendingInvitation(encodePendingInvitation('tok=', ' Martina '))).toEqual({
      token: 'tok=',
      name: 'Martina',
    });
  });

  it('sin nombre, no se inventa uno', () => {
    expect(decodePendingInvitation(encodePendingInvitation('tok=', '  '))).toEqual({
      token: 'tok=',
      name: null,
    });
  });

  it('el formato viejo (el token suelto) sigue sirviendo', () => {
    expect(decodePendingInvitation('tok=')).toEqual({ token: 'tok=', name: null });
  });

  it('nada guardado o basura', () => {
    expect(decodePendingInvitation(null)).toBeNull();
    expect(decodePendingInvitation('{"name":"x"}')).toBeNull();
  });
});

/**
 * O1 paso 1 · "Tengo una invitación" lleva a O2, y O2 necesita el token.
 *
 * WhatsApp, Notas o Mail solo vuelven tocable un http(s)://, así que el enlace
 * de la app (exp:// en desarrollo, radar:// en un build) llega como texto. La
 * salida es pegarlo en la app, y la gente pega lo que copió: a veces el
 * enlace, a veces el mensaje entero.
 */

// 32 bytes en base64 con + → - y / → _ (app_create_invitation): 44 caracteres.
const TOKEN = 'Ab3_xY9-Qw7Zp2Lm5Nk8Rt1Uv4Wx6Yz0Ab3Cd5Ef7Gh=';
const ENCODED = encodeURIComponent(TOKEN);

describe('parseInvitationToken', () => {
  it('el enlace de Expo Go', () => {
    expect(
      parseInvitationToken(`exp://abc1234-usuario-8081.exp.direct/--/invite/${ENCODED}`),
    ).toBe(TOKEN);
  });

  it('el enlace de un build propio', () => {
    expect(parseInvitationToken(`radar://invite/${ENCODED}`)).toBe(TOKEN);
  });

  it('un enlace https, con query o fragmento', () => {
    expect(parseInvitationToken(`https://radar.app/invite/${ENCODED}?ref=wa#x`)).toBe(TOKEN);
  });

  it('el mensaje entero que se compartió', () => {
    const message = `Te invito a Casa, para anotar los gastos que compartimos: radar://invite/${ENCODED}`;
    expect(parseInvitationToken(message)).toBe(TOKEN);
  });

  it('el token solo, con espacios alrededor', () => {
    expect(parseInvitationToken(`  ${TOKEN}\n`)).toBe(TOKEN);
  });

  it('un enlace codificado dos veces (los que se generaron antes del arreglo)', () => {
    // Caso real: encodeURIComponent + el encodeURI de Linking.createURL
    // convertían el "=" final en %253D.
    expect(
      parseInvitationToken(
        'exp://abc1234-usuario-8081.exp.direct/--/invite/Zq-8LmNp3RtVw5XyB7cD9fGh1JkM4nPq6sTu2vWx0yA%253D',
      ),
    ).toBe('Zq-8LmNp3RtVw5XyB7cD9fGh1JkM4nPq6sTu2vWx0yA=');
  });

  it('lo que llega como parámetro de ruta, todavía con un %3D', () => {
    expect(parseInvitationToken('Zq-8LmNp3RtVw5XyB7cD9fGh1JkM4nPq6sTu2vWx0yA%3D')).toBe(
      'Zq-8LmNp3RtVw5XyB7cD9fGh1JkM4nPq6sTu2vWx0yA=',
    );
  });

  it('el token sin decodificar también sirve', () => {
    expect(parseInvitationToken(`radar://invite/${TOKEN}`)).toBe(TOKEN);
  });

  it('lo que no es una invitación no se adivina', () => {
    expect(parseInvitationToken('')).toBeNull();
    expect(parseInvitationToken('hola')).toBeNull();
    expect(parseInvitationToken('https://google.com')).toBeNull();
    expect(parseInvitationToken('radar://invite/')).toBeNull();
    expect(parseInvitationToken('radar://invite/%E0%A4%A')).toBeNull();
  });
});
