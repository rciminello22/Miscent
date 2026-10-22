import type { Pesos } from '@domain/money';
import type { Category } from '@domain/types';

/**
 * §13 O3 paso 5 · las sugerencias tildables de fijos. TS puro: se testea en
 * node.
 *
 * Luz, Gas y Agua van por separado aunque los tres sean Servicios: cada uno
 * llega en su factura y con su monto (prueba del 12/10). Lo que no está en
 * la lista ("Monotributo", "Telepase") se carga como un fijo propio, con su
 * nombre y una categoría de la lista fija (P13): no se crean categorías.
 */

export type Suggestion = {
  key: string;
  category: Category;
  label: string;
  /** Lo que se guarda como nombre. `null` cuando el nombre ES la categoría. */
  description: string | null;
  /** §11 paso 3 · la pregunta si ya está en un espacio. */
  another: string;
};

export const SUGGESTIONS: readonly Suggestion[] = [
  { key: 'alquiler', category: 'alquiler', label: 'Alquiler', description: null, another: '¿Es otro alquiler?' },
  { key: 'expensas', category: 'expensas', label: 'Expensas', description: null, another: '¿Son otras expensas?' },
  { key: 'luz', category: 'servicios', label: 'Luz', description: 'Luz', another: '¿Es otra factura de luz?' },
  { key: 'gas', category: 'servicios', label: 'Gas', description: 'Gas', another: '¿Es otra factura de gas?' },
  { key: 'agua', category: 'servicios', label: 'Agua', description: 'Agua', another: '¿Es otra factura de agua?' },
  { key: 'internet', category: 'internet', label: 'Internet', description: null, another: '¿Es otro internet?' },
  { key: 'celular', category: 'celular', label: 'Celular', description: null, another: '¿Es otro celular?' },
  { key: 'gimnasio', category: 'gimnasio', label: 'Gimnasio', description: null, another: '¿Es otro gimnasio?' },
  { key: 'streaming', category: 'suscripciones', label: 'Streaming', description: null, another: '¿Es otro streaming?' },
  { key: 'prepaga', category: 'salud', label: 'Prepaga', description: null, another: '¿Es otra prepaga?' },
];

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase('es-AR');
}

/**
 * CA-09 · si un fijo que ya está en un espacio es el de esta sugerencia.
 *
 * Misma categoría, y si los dos tienen nombre, el mismo nombre: un "Luz"
 * compartido no avisa en "Gas". Un "Servicios" sin nombre puede ser
 * cualquiera, así que avisa en los tres: preguntar de más es barato, contar
 * dos veces no.
 */
export function matchesSuggestion(
  fixed: { category: Category; description: string | null },
  suggestion: Suggestion,
): boolean {
  if (fixed.category !== suggestion.category) return false;
  if (fixed.description == null || suggestion.description == null) return true;
  return normalize(fixed.description) === normalize(suggestion.description);
}

export type FixedDraft = { amount: Pesos; dayOfMonth: number };

/** "Otro fijo": nombre propio y una categoría de la lista fija. */
export type CustomFixed = {
  key: string;
  name: string;
  category: Category;
  amount: Pesos;
  dayOfMonth: number;
};

export type FixedToSave = {
  /** La sugerencia ("luz") o `custom:N`: de acá sale el id que lo hace idempotente (H-16). */
  key: string;
  category: Category;
  description: string | null;
  amount: Pesos;
  dayOfMonth: number;
};

/**
 * Lo que se guarda, en el orden de la lista. Sin monto no es un fijo; un fijo
 * propio sin nombre tampoco, porque no se distinguiría de nada.
 */
export function fixedToSave(
  drafts: Partial<Record<string, FixedDraft>>,
  customs: readonly CustomFixed[],
): FixedToSave[] {
  const fromSuggestions = SUGGESTIONS.flatMap((suggestion) => {
    const draft = drafts[suggestion.key];
    if (draft == null || draft.amount <= 0) return [];
    return [
      {
        key: suggestion.key,
        category: suggestion.category,
        description: suggestion.description,
        amount: draft.amount,
        dayOfMonth: draft.dayOfMonth,
      },
    ];
  });

  const fromCustoms = customs.flatMap((custom) => {
    const name = custom.name.trim();
    if (custom.amount <= 0 || name === '') return [];
    return [
      {
        key: `custom:${custom.key}`,
        category: custom.category,
        description: name,
        amount: custom.amount,
        dayOfMonth: custom.dayOfMonth,
      },
    ];
  });

  return [...fromSuggestions, ...fromCustoms];
}
