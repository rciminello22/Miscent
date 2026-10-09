import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * El token de una invitación, guardado mientras el invitado va al mail y
 * vuelve (O2 paso 3).
 *
 * Es el mismo problema que `onboardingIntent`: el enlace mágico saca al
 * usuario de la app y lo trae de vuelta por otro camino, así que lo que estaba
 * haciendo tiene que sobrevivir el viaje.
 *
 * Sin esto, alguien que abre una invitación sin tener sesión entraría a la app
 * y perdería la invitación: quedaría como un usuario sin espacios, que es
 * exactamente lo que no tiene que pasar.
 */

const KEY = 'radar.invitation.token';

export async function rememberInvitationToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, token);
  } catch {
    // Degrada: el usuario puede volver a abrir el enlace, que sigue siendo
    // válido (I-02: un solo uso, pero todavía no se usó).
  }
}

export async function takeInvitationToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(KEY);
    if (token == null) return null;
    await AsyncStorage.removeItem(KEY);
    return token;
  } catch {
    return null;
  }
}
