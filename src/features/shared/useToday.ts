import { useEffect, useState } from 'react';
import type { IsoDate } from '@domain/calendar';

/**
 * La fecha de hoy, como hecho de la interfaz.
 *
 * El dominio NUNCA lee el reloj: `hoy` siempre se le pasa (de ahí que sea
 * testeable). Este hook es el único lugar de la app que mira la hora del
 * sistema, y lo hace una vez.
 *
 * G-01 · el mes es el mes calendario en la zona horaria del usuario, que es
 * justamente la del dispositivo.
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState<IsoDate>(() => currentIsoDate());

  useEffect(() => {
    // Si la app queda abierta y cruza la medianoche, el mes tiene que cambiar.
    const interval = setInterval(() => {
      const next = currentIsoDate();
      setToday((previous) => (previous === next ? previous : next));
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return today;
}

function currentIsoDate(): IsoDate {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
