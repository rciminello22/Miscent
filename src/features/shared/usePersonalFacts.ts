import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { addMonths, monthOf } from '@domain/calendar';
import { expandPersonalOccurrences, type PersonalExpansion } from '@domain/occurrences';
import type { PersonalFacts } from '@domain/types';
import { queryKeys } from '@/data/queryClient';
import { fetchPersonalFacts } from '@/data/repositories/personal';
import {
  createPersonalMovement,
  createRecurrence,
  deletePersonalMovement,
  type NewPersonalMovement,
  type NewRecurrence,
} from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
import { useToday } from './useToday';

const EMPTY: PersonalFacts = {
  userId: '',
  paymentMethods: [],
  movements: [],
  recurrences: [],
  overrides: [],
  declaredStatements: [],
  spaces: [],
};

/**
 * Los hechos de la cuenta personal, y su expansión a ocurrencias.
 *
 * Una sola query trae todos los hechos y el dominio deriva de ahí el radar de
 * cualquier mes, Futuro, Próximos pagos y el detalle de cada tarjeta. Por eso
 * no hay un endpoint por pantalla: §7.4 dice que la app guarda hechos y
 * calcula todo lo demás, así que las pantallas comparten la misma lectura.
 *
 * El horizonte se expande desde el mes pasado hasta 7 meses adelante: cubre el
 * radar del mes actual, los 6 meses de Futuro y el mes anterior, que
 * Movimientos necesita para poder mirar atrás.
 */
export function usePersonalFacts() {
  const { session } = useSession();
  const today = useToday();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: queryKeys.personalFacts(userId ?? 'anon'),
    queryFn: () => fetchPersonalFacts(userId!),
    enabled: userId != null,
  });

  const facts = query.data ?? EMPTY;

  const expansion = useMemo<PersonalExpansion>(() => {
    const current = monthOf(today);
    return expandPersonalOccurrences(facts, {
      from: addMonths(current, -1),
      to: addMonths(current, 7),
    });
  }, [facts, today]);

  return { ...query, facts, expansion, today };
}

/** Invalida la lectura después de escribir, para que todo se recalcule. */
function useInvalidateFacts() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
    });
}

export function useCreateMovement() {
  const { session } = useSession();
  const invalidate = useInvalidateFacts();

  return useMutation({
    mutationFn: (input: NewPersonalMovement) => createPersonalMovement(session!.user.id, input),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteMovement() {
  const invalidate = useInvalidateFacts();

  return useMutation({
    mutationFn: (id: string) => deletePersonalMovement(id),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateRecurrence() {
  const { session } = useSession();
  const invalidate = useInvalidateFacts();

  return useMutation({
    mutationFn: (input: NewRecurrence) => createRecurrence(session!.user.id, input),
    onSuccess: () => void invalidate(),
  });
}
