import type { Slot, SpaceFacts } from '@domain/types';

/**
 * H-07 · qué pasa DE VERDAD al salir, para que la pantalla diga eso y no otra
 * cosa.
 *
 * SA-06 · "Sin miembros con acceso, el espacio se elimina; en Modo 1 el
 * creador puede eliminarlo." Si el otro nunca entró (o ya no tiene acceso),
 * quien sale es el último: el servidor elimina el espacio con todo lo que
 * tiene. La pantalla decía "tu nombre queda en el historial porque esos
 * registros también son de X" y "X va a decidir": X no iba a ver nada.
 *
 * Lo que se conserva en ese caso es la foto de quien sale (SA-05, 0018): sus
 * meses pasados no cambian y queda en "Espacios que dejaste".
 *
 * La app le manda al servidor lo que mostró (`deletesSpace`): si mientras
 * tanto el otro entró o salió, el servidor no hace nada y la pantalla vuelve
 * a leer (`app_leave_space_as_shown`).
 */
export function leaveDeletesSpace(facts: SpaceFacts, mySlot: Slot): boolean {
  const other = facts.space.members.find((member) => member.slot !== mySlot);
  return other?.status !== 'active';
}

export type LeaveDeletionCopy = {
  title: string;
  why: string;
  lost: string[];
  kept: string;
  confirm: string;
  action: string;
};

/** El texto de salir de un espacio que se elimina, con lo que se pierde contado. */
export function leaveDeletionCopy(facts: SpaceFacts, otherName: string): LeaveDeletionCopy {
  const name = facts.space.name;
  const records = facts.expenses.length + facts.recurrences.length + facts.payments.length;
  const neverJoined = facts.space.members.some(
    (member) => member.displayName === otherName && member.status === 'no_access',
  );

  return {
    title: `Si salís, ${name} se elimina`,
    why: neverJoined
      ? `${otherName} nunca entró a ${name}. Si salís, no queda nadie con acceso, y el espacio se elimina con todo lo que tiene.`
      : `${otherName} ya no tiene acceso a ${name}. Si salís, no queda nadie, y el espacio se elimina con todo lo que tiene.`,
    lost: [
      records === 0
        ? `${name} deja de existir.`
        : `${records === 1 ? 'El registro' : `Los ${records} registros`} de ${name} (gastos, cuotas, fijos y pagos) se borran para siempre.`,
      'Si mandaste una invitación, deja de servir.',
      `Nadie va a poder volver a ver ${name}.`,
    ],
    kept: `Tus meses pasados no cambian: ${name} queda en "Espacios que dejaste" con lo que había hasta hoy.`,
    confirm: `Se elimina ${name} con todo lo que tiene. No se puede deshacer.`,
    action: `Eliminar ${name} y salir`,
  };
}
