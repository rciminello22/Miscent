/**
 * §33 U1 · qué muestra el espacio del invitado además del espacio. TS puro.
 *
 * Las dos marcas ("Entendido", "Ahora no") sobreviven cerrar la app y se leen de
 * forma asíncrona: mientras no se sabe (`null`) no se muestra nada, así no
 * parpadea una tarjeta que ya se cerró.
 */
export type GuestHomeBlocks = {
  /** La bienvenida única, arriba del N1. */
  welcome: boolean;
  /** "Tu plata personal" al pie: tarjeta, o una línea después de "Ahora no". */
  personalCard: 'full' | 'line' | null;
};

export function guestHomeBlocks(input: {
  /** El invitado con un solo espacio, para quien el espacio ES su pantalla principal. */
  isGuestHome: boolean;
  welcomed: boolean | null;
  notNow: boolean | null;
}): GuestHomeBlocks {
  if (!input.isGuestHome) return { welcome: false, personalCard: null };

  let personalCard: GuestHomeBlocks['personalCard'] = null;
  if (input.notNow != null) personalCard = input.notNow ? 'line' : 'full';

  return { welcome: input.welcomed === false, personalCard };
}
