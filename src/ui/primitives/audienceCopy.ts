/**
 * Los textos de la audiencia. §12 · PR-03. TS puro (sin React Native), para
 * poder testearlos en node.
 */

export type Audience =
  | { kind: 'private' }
  | { kind: 'shared'; otherMemberName: string; spaceName?: string };

/** La marca corta de las listas y los encabezados. Los textos son los de §33, literales. */
export function audienceLabel(audience: Audience): string {
  return audience.kind === 'private' ? 'Solo vos' : `Lo ven vos y ${audience.otherMemberName}`;
}

/**
 * La frase completa, para junto al botón de guardar (§12: selector de destino
 * con "Solo vos lo ves" / "Lo ven vos y Martina"): ahí "Solo vos" a secas se
 * podría leer como un rótulo y no como lo que pasa al guardar.
 */
export function audienceSentence(audience: Audience): string {
  return audience.kind === 'private' ? 'Solo vos lo ves' : audienceLabel(audience);
}
