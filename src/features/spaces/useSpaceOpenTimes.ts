import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  decodeOpenTimes,
  encodeOpenTimes,
  recordOpen,
  type OpenTimes,
} from './spaceOpenTimes';

/**
 * 3ii · el último momento en que se abrió cada espacio, guardado en este
 * dispositivo. Es una comodidad (ordena la lista): si el almacenamiento falla,
 * se degrada a "sin dato" y la lista se ordena por nombre.
 */
const KEY = 'radar.spaces.openedAt';

async function readOpenTimes(): Promise<OpenTimes> {
  try {
    return decodeOpenTimes(await AsyncStorage.getItem(KEY));
  } catch {
    return {};
  }
}

/** Anota que se abrió `spaceId` ahora. Nunca tira ni bloquea abrir el espacio. */
export async function rememberSpaceOpened(spaceId: string): Promise<void> {
  try {
    const times = await readOpenTimes();
    await AsyncStorage.setItem(KEY, encodeOpenTimes(recordOpen(times, spaceId, Date.now())));
  } catch {
    // Sin dato de apertura la lista se ordena por nombre: no es un error para el usuario.
  }
}

/**
 * Los momentos de apertura, releídos cada vez que la pantalla vuelve a estar a
 * la vista: al volver de un espacio, ese sube al primer lugar.
 */
export function useSpaceOpenTimes(): OpenTimes {
  const [times, setTimes] = useState<OpenTimes>({});

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void readOpenTimes().then((read) => {
        if (alive) setTimes(read);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  return times;
}
