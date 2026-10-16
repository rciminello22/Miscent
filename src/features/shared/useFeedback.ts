import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Month } from '@domain/calendar';
import type { Member } from '@domain/types';
import { futureMonthRoute } from '@/features/future/paymentsMonth';
import { queryKeys } from '@/data/queryClient';
import { deletePersonalMovement, deleteRecurrence } from '@/data/repositories/mutations';
import { deleteMemberPayment, deleteSharedExpense } from '@/data/repositories/spaces';
import { useSession } from '@/features/auth/SessionProvider';
import { useToast, type ToastAction } from '@/ui/primitives';
import { deletedTitle, savedTitle, type FeedbackAudience } from './feedbackCopy';

/**
 * §17 · §12 · el feedback de toda la app, con tres reglas:
 *
 *   1. Guardar SIEMPRE confirma qué pasó y quién lo ve, con "Deshacer" cuando
 *      se puede.
 *   2. Eliminar confirma que se eliminó (la confirmación previa, con la
 *      consecuencia, la pide cada pantalla: X-03).
 *   3. Un error SIEMPRE se muestra. Nunca un `void` que lo trague.
 */

/** Lo recién creado, para poder deshacerlo. */
export type Created =
  | { kind: 'movement'; id: string }
  | { kind: 'recurrence'; id: string; spaceId?: string }
  | { kind: 'shared-expense'; id: string; spaceId: string }
  | { kind: 'payment'; id: string; spaceId: string };

/** El espacio como audiencia del aviso. */
export function spaceAudience(spaceName: string, other: Member): FeedbackAudience {
  return { kind: 'shared', spaceName, otherName: other.displayName, otherStatus: other.status };
}

/**
 * Deshacer una creación. Es una función suelta y no un hook de la pantalla:
 * cuando se toca "Deshacer", la pantalla que guardó ya se cerró.
 */
export async function undoCreation(
  queryClient: QueryClient,
  userId: string,
  created: Created,
): Promise<void> {
  switch (created.kind) {
    case 'movement':
      await deletePersonalMovement(created.id);
      break;
    case 'recurrence':
      await deleteRecurrence(created.id);
      break;
    case 'shared-expense':
      await deleteSharedExpense(created.id);
      break;
    case 'payment':
      await deleteMemberPayment(created.id);
      break;
  }

  const spaceId = 'spaceId' in created ? created.spaceId : undefined;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.personalFacts(userId) }),
    spaceId != null ? queryClient.invalidateQueries({ queryKey: queryKeys.spaces }) : null,
    spaceId != null
      ? queryClient.invalidateQueries({ queryKey: queryKeys.spaceFacts(spaceId) })
      : null,
  ]);
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message !== ''
    ? error.message
    : 'Probá de nuevo en un momento.';
}

export function useFeedback() {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? 'anon';

  function error(title: string, cause?: unknown) {
    toast.show({ title, detail: messageOf(cause), tone: 'error' });
  }

  return {
    error,

    /** Regla 1 · "Guardado · Solo vos lo ves" / "Agregado a Casa · Martina lo ve · Deshacer". */
    saved(args: {
      audience: FeedbackAudience;
      detail?: string | null;
      undo?: Created;
      /**
       * §17 · una compra en cuotas: el mes de su primera cuota. Suma "Ver en
       * Futuro", que abre Futuro con ese mes elegido (solo con cuenta personal).
       */
      futureMonth?: Month;
    }) {
      const { undo, futureMonth } = args;
      const actions: ToastAction[] = [];

      if (futureMonth != null) {
        actions.push({
          label: 'Ver en Futuro',
          onPress: () => router.push(futureMonthRoute(futureMonth, Date.now())),
        });
      }
      if (undo != null) {
        actions.push({
          label: 'Deshacer',
          onPress: () => {
            undoCreation(queryClient, userId, undo)
              .then(() => toast.show({ title: 'Listo, no se guardó' }))
              .catch((cause: unknown) => error('No pudimos deshacerlo', cause));
          },
        });
      }

      toast.show({ title: savedTitle(args.audience), detail: args.detail, actions });
    },

    /** Regla 2. */
    deleted(audience: FeedbackAudience, detail?: string | null) {
      toast.show({ title: deletedTitle(audience), detail });
    },

    /** Para un cambio que no es crear ni eliminar: "Cambios guardados". */
    updated(detail?: string | null) {
      toast.show({ title: 'Cambios guardados', detail });
    },
  };
}
