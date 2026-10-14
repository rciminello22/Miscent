import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Una marca que sobrevive cerrar la app: "ya vio la bienvenida", "dijo Ahora
 * no". §33 U1 · la tarjeta "Tu plata personal" nunca insiste: si la marca
 * viviera en el estado de la pantalla, volvería a aparecer en cada apertura.
 *
 * Mientras lee, `value` es `null`: la pantalla no muestra nada hasta saber,
 * así no parpadea una tarjeta que ya se cerró. Si el almacenamiento falla,
 * degrada a "no visto" (mostrar de más es mejor que esconder la bienvenida).
 */
export function useRememberedFlag(key: string): [boolean | null, () => void] {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((stored) => alive && setValue(stored === '1'))
      .catch(() => alive && setValue(false));
    return () => {
      alive = false;
    };
  }, [key]);

  const mark = useCallback(() => {
    setValue(true);
    AsyncStorage.setItem(key, '1').catch(() => undefined);
  }, [key]);

  return [value, mark];
}
