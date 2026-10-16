import type { SharedBalance } from '@domain/shared-balance';
import type { MemberStatus } from '@domain/types';
import { balanceSentence } from './balanceCopy';
import { balanceScaleState } from './balanceScaleState';
import { pendingPill } from './spaceListCopy';
import type { SpaceListItem } from './spaceListOrder';

/**
 * 3ii · lo que dice cada fila de la lista de Compartidos. TS puro: la fila solo
 * lo dibuja. La balanza y la frase salen de los mismos estados puros que usa el
 * espacio por dentro (`balanceScaleState`, `balanceSentence`), así que no hay dos
 * fuentes para el mismo saldo.
 */
export type SpaceRowModel = {
  id: string;
  name: string;
  myName: string;
  otherName: string;
  /** Todavía no entró: avatar punteado. Un ex miembro no es punteado. */
  otherDashed: boolean;
  /** La otra persona salió: la fila lleva borde punteado. */
  former: boolean;
  /** La balanza mini de la caja del ícono; `null` mientras cargan las cuentas. */
  glyph: { direction: -1 | 0 | 1; showCheck: boolean; label: string } | null;
  sentence: string | null;
  settled: boolean;
  pill: string | null;
  note: string | null;
  loading: boolean;
  accessibilityLabel: string;
  /** Lo que necesitan el orden, el filtro y la búsqueda. */
  item: SpaceListItem;
};

export function buildSpaceRow(args: {
  space: {
    id: string;
    name: string;
    otherMemberName: string;
    otherHasAccess: boolean;
    otherIsFormer: boolean;
  };
  myName: string;
  /** Las cuentas del espacio; `null` mientras cargan. */
  scale: { balance: SharedBalance; other: { displayName: string; status: MemberStatus } } | null;
  /** Lo que está por revisar, ya sumado (`pendingTotal`). */
  pending: number;
  lastOpenedAt: number | null;
}): SpaceRowModel {
  const { space, scale } = args;

  const state =
    scale == null
      ? null
      : balanceScaleState({ balance: scale.balance, myName: args.myName, other: scale.other });
  const sentence = scale == null ? null : balanceSentence(scale.balance);
  const pill = pendingPill(args.pending);

  // §24 · el estado del otro miembro.
  let note: string | null = null;
  if (space.otherIsFormer) note = `${space.otherMemberName} · ex miembro`;
  else if (!space.otherHasAccess) note = `${space.otherMemberName} todavía no entró`;

  return {
    id: space.id,
    name: space.name,
    myName: args.myName,
    otherName: space.otherMemberName,
    otherDashed: !space.otherHasAccess && !space.otherIsFormer,
    former: space.otherIsFormer,
    glyph:
      state == null
        ? null
        : { direction: state.direction, showCheck: state.showCheck, label: state.accessibilityLabel },
    sentence,
    settled: scale?.balance.settled ?? false,
    pill,
    note,
    loading: scale == null,
    accessibilityLabel: [space.name, sentence, pill, note].filter((part) => part != null).join('. '),
    item: {
      id: space.id,
      name: space.name,
      otherName: space.otherMemberName,
      ready: scale != null,
      pending: args.pending,
      balance: scale?.balance.amount ?? 0,
      lastOpenedAt: args.lastOpenedAt,
    },
  };
}
