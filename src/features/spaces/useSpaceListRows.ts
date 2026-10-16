import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryClient';
import { fetchSpaceFacts, type SpaceSummary } from '@/data/repositories/spaces';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { buildSpaceRow, type SpaceRowModel } from './spaceRow';
import { countSpacePendings } from './useSpacePendings';
import { useSpaceOpenTimes } from './useSpaceOpenTimes';
import { deriveSpace } from './useSpaces';

/**
 * Las filas de la lista de Compartidos, una por espacio. Es el container: trae
 * las cuentas de TODOS los espacios de una vez (la misma consulta y la misma
 * cuenta que usa cada espacio por dentro), porque el orden y el filtro
 * necesitan saber el saldo y lo pendiente de cada uno antes de dibujar.
 */
export function useSpaceListRows(spaces: readonly SpaceSummary[]): SpaceRowModel[] {
  const today = useToday();
  const { accountState, profile } = useSession();
  const { facts: personalFacts } = usePersonalFacts();
  const openTimes = useSpaceOpenTimes();

  const data = useQueries({
    queries: spaces.map((space) => ({
      queryKey: queryKeys.spaceFacts(space.id),
      queryFn: () => fetchSpaceFacts(space.id),
    })),
    // Una referencia estable mientras los datos no cambien.
    combine: (results) => results.map((result) => result.data),
  });

  return useMemo(
    () =>
      spaces.map((space, index) => {
        const loaded = data[index];
        const derived = loaded == null ? null : deriveSpace(loaded, today);
        const membership = personalFacts.spaces.find(
          (candidate) => candidate.facts.space.id === space.id,
        );
        const pendings = countSpacePendings({ derived, membership, accountState, today });

        return buildSpaceRow({
          space,
          myName: derived?.me.displayName ?? profile?.displayName ?? 'Vos',
          scale:
            derived == null ? null : { balance: derived.balance, other: derived.other },
          pending: pendings.total,
          lastOpenedAt: openTimes[space.id] ?? null,
        });
      }),
    [spaces, data, today, personalFacts, accountState, profile, openTimes],
  );
}
