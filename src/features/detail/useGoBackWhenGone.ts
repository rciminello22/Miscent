import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';

/**
 * Una pantalla de detalle cuyo registro desaparece (porque se quitó el espacio
 * del historial) vuelve sola con `goBack`: no queda abierta sobre algo que ya
 * no existe. `gone` tiene que ser `true` SOLO cuando se sabe que no está (con la
 * consulta ya leída): mientras carga, no es lo mismo que "no está".
 *
 * Es `goBack` y no un `replace`: salir siempre tiene salida (HANDOFF §11).
 */
export function useGoBackWhenGone(gone: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (gone) goBack(router);
  }, [gone, router]);
}
