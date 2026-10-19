import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryClient';
import { removeFormerSpace } from '@/data/repositories/spaces';
import { useSession } from '@/features/auth/SessionProvider';
import { useFeedback } from '@/features/shared/useFeedback';
import { useToast } from '@/ui/primitives';

/**
 * Quitar un espacio de tu historial: llama a la RPC (0021) y, al terminar,
 * refresca los hechos de la cuenta personal.
 *
 * Los hechos personales traen las fotos de los espacios dejados (`former_
 * memberships`), y de ellos salen Movimientos, Futuro, el radar e Inicio: una
 * sola consulta, así que invalidarla recalcula todo. No hay otra caché que
 * tocar (los espacios activos no cambian).
 *
 * El aviso de después lo arma quien llama ANTES de quitar (`toast`): cuando la
 * consulta se refresca, la foto ya no está para decir qué meses cambiaron.
 * Si la función todavía no existe en la base, el error sale por toast y no se
 * rompe nada.
 */
export function useRemoveFormerSpace() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const feedback = useFeedback();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: {
      spaceId: string;
      toast: { title: string; detail: string | null };
    }) => removeFormerSpace(input.spaceId),
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
      });
      toast.show({ title: input.toast.title, detail: input.toast.detail });
    },
    onError: (error: Error) => feedback.error('No pudimos quitar el espacio', error),
  });
}
