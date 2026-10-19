import { addMonths, compareMonths, monthOf, type IsoDate, type Month } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { expandPersonalOccurrences, spaceHorizon, type PersonalOccurrence } from '@domain/occurrences';
import { calculateSharedBalance } from '@domain/shared-balance';
import type { PaymentMethod, PersonalFacts } from '@domain/types';
import { formatLongDate, formatMonth, formatPesos } from '@/lib/format';
import { departureBalanceSentence } from '@/features/spaces/balanceCopy';

/**
 * Quitar un espacio de tu historial (19/10). TS puro: se testea en node.
 *
 * Al salir de un espacio, el servidor guarda una foto privada
 * (`former_memberships`, 0018) que el dominio lee con `leftOn`. Quitarla saca el
 * espacio ENTERO de la cuenta: su parte deja de contar en el radar de los meses
 * en que estuvo, sus filas dejan de verse en Movimientos y el resumen del saldo
 * al salir desaparece. Para el otro miembro no cambia nada.
 *
 * La regla de cuándo se ofrece es de la app, no de la base: solo si no quedan
 * cuotas por venir (para no sacar compromisos que siguen). La calcula el
 * dominio sobre la foto.
 */

export type Membership = PersonalFacts['spaces'][number];

export type FormerSpaceRow = {
  spaceId: string;
  name: string;
  leftOn: IsoDate;
  /** "Saliste el 12 de octubre" */
  leftLine: string;
  /** La frase de las cuotas que quedan; `null` si se puede quitar. */
  blockedLine: string | null;
  canRemove: boolean;
};

export type RemovalSheet = {
  title: string;
  intro: string;
  rows: { kind: 'radar' | 'movements' | 'summary'; text: string }[];
  /** "Para Gonzalo no cambia nada, ni para nadie más." */
  reassurance: string;
  warning: string;
};

/** Cuántos meses se nombran uno por uno antes de decir "de enero a octubre". */
const MAX_LISTED_MONTHS = 6;

/** Las ocurrencias de la foto tal como las ve el radar de la cuenta personal. */
function occurrencesOf(
  membership: Membership,
  paymentMethods: readonly PaymentMethod[],
  today: IsoDate,
): PersonalOccurrence[] {
  const alone: PersonalFacts = {
    userId: '',
    paymentMethods: [...paymentMethods],
    movements: [],
    recurrences: [],
    overrides: [],
    declaredStatements: [],
    spaces: [membership],
  };
  return expandPersonalOccurrences(alone, spaceHorizon(membership.facts, today)).occurrences;
}

/**
 * ¿Falta pagar algo de este espacio? Una fecha de pago posterior a hoy, o un mes
 * sin día conocido (T-05) que todavía no terminó: ante la duda no se saca un
 * compromiso que sigue.
 */
function isUpcoming(occurrence: PersonalOccurrence, today: IsoDate): boolean {
  if (occurrence.paymentDate != null) return occurrence.paymentDate > today;
  return compareMonths(occurrence.month, monthOf(today)) >= 0;
}

/** El mes de la última cuota por venir, o `null` si no queda ninguna. */
export function upcomingUntil(
  membership: Membership,
  paymentMethods: readonly PaymentMethod[],
  today: IsoDate,
): Month | null {
  let last: Month | null = null;
  for (const occurrence of occurrencesOf(membership, paymentMethods, today)) {
    if (!isUpcoming(occurrence, today)) continue;
    if (last == null || compareMonths(occurrence.month, last) > 0) last = occurrence.month;
  }
  return last;
}

/** Los espacios de los que saliste, el más reciente primero. */
export function listFormerSpaces(facts: PersonalFacts, today: IsoDate): FormerSpaceRow[] {
  const rows: FormerSpaceRow[] = [];

  for (const membership of facts.spaces) {
    if (membership.leftOn == null) continue;
    const name = membership.facts.space.name;
    const until = upcomingUntil(membership, facts.paymentMethods, today);

    rows.push({
      spaceId: membership.facts.space.id,
      name,
      leftOn: membership.leftOn,
      leftLine: `Saliste el ${formatLongDate(membership.leftOn)}`,
      blockedLine:
        until == null
          ? null
          : `Todavía quedan cuotas de ${name} hasta ${formatMonth(until, monthOf(today))}: cuando terminen la vas a poder quitar.`,
      canRemove: until == null,
    });
  }

  return rows.sort((a, b) => (a.leftOn < b.leftOn ? 1 : a.leftOn > b.leftOn ? -1 : 0));
}

/** "Sus 9 gastos desaparecen de Movimientos." con el plural que corresponde. */
export function movementsLine(expenses: number, payments: number): string {
  if (expenses === 0 && payments === 0) return 'No tiene gastos en Movimientos.';

  const subjects: string[] = [];
  if (expenses === 1) subjects.push('Su gasto');
  else if (expenses > 1) subjects.push(`Sus ${expenses} gastos`);

  if (payments > 0) {
    const pay = payments === 1 ? 'el pago entre ustedes' : 'los pagos entre ustedes';
    // Sin gastos, el pago es el sujeto: va con mayúscula.
    subjects.push(subjects.length === 0 ? pay.charAt(0).toUpperCase() + pay.slice(1) : pay);
  }

  const single = expenses + payments === 1;
  return `${subjects.join(' y ')} ${single ? 'desaparece' : 'desaparecen'} de Movimientos.`;
}

type Impact = { months: Month[]; total: Pesos };

/**
 * Qué meses del radar cambian y cuánto suma tu parte. Los meses van desde el
 * primer gasto o cuota de la foto hasta la salida; si una cuota ya pagada cae
 * después de la salida, hasta ella.
 */
function impactOf(
  membership: Membership,
  paymentMethods: readonly PaymentMethod[],
  today: IsoDate,
): Impact {
  const occurrences = occurrencesOf(membership, paymentMethods, today);
  if (occurrences.length === 0) return { months: [], total: 0 };

  let first = occurrences[0]!.month;
  let last = first;
  let total = 0;
  for (const occurrence of occurrences) {
    total += occurrence.myShare;
    if (compareMonths(occurrence.month, first) < 0) first = occurrence.month;
    if (compareMonths(occurrence.month, last) > 0) last = occurrence.month;
  }

  const left = membership.leftOn == null ? last : monthOf(membership.leftOn);
  const end = compareMonths(left, last) > 0 ? left : last;

  const months: Month[] = [];
  for (let month = first; compareMonths(month, end) <= 0; month = addMonths(month, 1)) {
    months.push(month);
  }
  return { months, total };
}

/** "agosto, septiembre y octubre" · de a seis o menos; más, "enero a octubre". */
function monthsPhrase(months: readonly Month[], reference: Month): string {
  const names = months.map((month) => formatMonth(month, reference));
  if (names.length > MAX_LISTED_MONTHS) return `${names[0]} a ${names[names.length - 1]}`;
  if (names.length <= 2) return names.join(' y ');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** "agosto a octubre" para el aviso de después; con un solo mes, ese mes. */
function rangePhrase(months: readonly Month[], reference: Month): string {
  const first = months[0]!;
  const last = months[months.length - 1]!;
  return months.length === 1
    ? formatMonth(first, reference)
    : `${formatMonth(first, reference)} a ${formatMonth(last, reference)}`;
}

/** La hoja de confirmación y el aviso de después, con lo que cambia de verdad. */
export function removalCopy(
  membership: Membership,
  paymentMethods: readonly PaymentMethod[],
  today: IsoDate,
): { sheet: RemovalSheet; toast: { title: string; detail: string | null } } {
  const name = membership.facts.space.name;
  const other = membership.facts.space.members.find((member) => member.slot !== membership.mySlot)!;
  const { months, total } = impactOf(membership, paymentMethods, today);
  const reference = membership.leftOn == null ? monthOf(today) : monthOf(membership.leftOn);

  const radar =
    months.length === 0
      ? `Tu radar no cambia: tu parte de ${name} no suma a ningún mes.`
      : `Tu radar de ${monthsPhrase(months, reference)} deja de contar tu parte de ${name} (${formatPesos(total, { sign: 'never' })} en total).`;

  // P6 · la frase real del saldo al salir, sin su punto final.
  const balance = calculateSharedBalance(
    membership.facts,
    membership.mySlot,
    membership.leftOn ?? today,
  );
  const summary = departureBalanceSentence(balance).replace(/\.$/, '');

  return {
    sheet: {
      title: `¿Quitar ${name} de tu historial?`,
      intro: 'Esto es lo que cambia en tu cuenta:',
      rows: [
        { kind: 'radar', text: radar },
        {
          kind: 'movements',
          text: movementsLine(membership.facts.expenses.length, membership.facts.payments.length),
        },
        { kind: 'summary', text: `El resumen "${summary}" deja de verse.` },
      ],
      reassurance: `Para ${other.displayName} no cambia nada, ni para nadie más.`,
      warning: 'No se puede deshacer.',
    },
    toast: {
      title: `Quitaste ${name} de tu historial`,
      detail:
        months.length === 0 ? null : `Tu radar de ${rangePhrase(months, reference)} ya no lo cuenta.`,
    },
  };
}
