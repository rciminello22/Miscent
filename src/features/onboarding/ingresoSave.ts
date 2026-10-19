import type { Pesos } from '@domain/money';

/**
 * Lo que el usuario cargó en el paso de Ingreso, ya traducido a lo que se guarda.
 */
export type IncomeDraft = {
  amount: Pesos;
  dayOfMonth: number | null;
  dayApprox: boolean;
};

/** El ingreso que este paso ya creó, y con qué valores. */
export type SavedIncome = { id: string; draft: IncomeDraft };

export type IncomeSave = { kind: 'create' } | { kind: 'update'; id: string } | { kind: 'navigate' };

/**
 * Qué hace "Continuar" en el paso de Ingreso.
 *
 * La pantalla queda montada en el stack: si el usuario vuelve desde Tarjetas y
 * toca Continuar de nuevo, un `insert` más dejaba DOS sueldos y el radar
 * contaba el doble. Por eso el paso recuerda el ingreso que creó:
 *   - nunca creó uno: lo crea;
 *   - ya lo creó y cambió algo: actualiza ESE mismo;
 *   - ya lo creó y no cambió nada: solo sigue.
 */
export function incomeSaveAction(saved: SavedIncome | null, draft: IncomeDraft): IncomeSave {
  if (saved == null) return { kind: 'create' };
  const same =
    saved.draft.amount === draft.amount &&
    saved.draft.dayOfMonth === draft.dayOfMonth &&
    saved.draft.dayApprox === draft.dayApprox;
  return same ? { kind: 'navigate' } : { kind: 'update', id: saved.id };
}
