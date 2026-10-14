import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodePersonalDraft, type PersonalDraft } from './personalDraftCodec';

/**
 * Caso 18 · el borrador de la invitada, guardado mientras crea su cuenta
 * personal (O3, y sin email también "guardar el acceso"). Mismo patrón que
 * el token de una invitación: lo que estaba haciendo sobrevive el viaje.
 */

const KEY = 'radar.personal.draft';

export async function rememberPersonalDraft(encoded: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, encoded);
  } catch {
    // Degrada: el monto lo vuelve a cargar a mano. No bloquea crear la cuenta.
  }
}

/** Lo devuelve y lo borra: se guarda una sola vez. */
export async function takePersonalDraft(): Promise<PersonalDraft | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored == null) return null;
    await AsyncStorage.removeItem(KEY);
    return decodePersonalDraft(stored);
  } catch {
    return null;
  }
}
