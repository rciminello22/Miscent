import { describe, it, expect } from 'vitest';
import { guestHomeBlocks } from './guestHome';

/**
 * §33 U1 · el espacio del invitado (Estado B). Que entienda en segundos que está
 * en un espacio compartido y que lo personal es otra cosa:
 *   · bienvenida UNA sola vez ("Entendido" persiste)
 *   · "Tu plata personal" al pie; "Ahora no" la reduce a una línea y nunca insiste
 * K0 / CA-06 · sin candados ni cuenta "incompleta".
 */
describe('guestHomeBlocks', () => {
  it('la primera vez: bienvenida arriba y "Tu plata personal" al pie', () => {
    expect(guestHomeBlocks({ isGuestHome: true, welcomed: false, notNow: false })).toEqual({
      welcome: true,
      personalCard: 'full',
    });
  });

  it('después de "Entendido" la bienvenida no vuelve', () => {
    expect(guestHomeBlocks({ isGuestHome: true, welcomed: true, notNow: false }).welcome).toBe(false);
  });

  it('después de "Ahora no" la tarjeta es una línea, y no vuelve a ser tarjeta', () => {
    expect(guestHomeBlocks({ isGuestHome: true, welcomed: true, notNow: true })).toEqual({
      welcome: false,
      personalCard: 'line',
    });
  });

  it('mientras se lee lo recordado no se muestra nada: no parpadea algo que ya se cerró', () => {
    expect(guestHomeBlocks({ isGuestHome: true, welcomed: null, notNow: null })).toEqual({
      welcome: false,
      personalCard: null,
    });
    expect(guestHomeBlocks({ isGuestHome: true, welcomed: false, notNow: null }).personalCard).toBeNull();
    expect(guestHomeBlocks({ isGuestHome: true, welcomed: null, notNow: false }).welcome).toBe(false);
  });

  it('quien tiene cuenta personal (o el invitado con varios espacios) no ve nada de esto', () => {
    expect(guestHomeBlocks({ isGuestHome: false, welcomed: false, notNow: false })).toEqual({
      welcome: false,
      personalCard: null,
    });
  });
});
