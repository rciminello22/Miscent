import Animated, { FadeInDown } from 'react-native-reanimated';
import type { SpaceSummary } from '@/data/repositories/spaces';
import { Stack } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useSpace } from './useSpaces';
import { useOpenSpace } from './useOpenSpace';
import { useSpacePendings } from './useSpacePendings';
import { balanceSentence } from './balanceCopy';
import { SpaceBalanceScale } from './SpaceBalanceScale';
import { SpaceCard } from './SpaceCard';
import { pendingPill } from './spaceListCopy';

/**
 * La lista de espacios. §14 · P23: "Compartidos: lista de espacios → cada
 * espacio", SIEMPRE, aunque haya uno solo.
 *
 * K1 · un usuario puede tener varios, "con poco protagonismo en la UX": de ahí
 * que sea una lista sobria y no un tablero. Y los saldos no se suman entre
 * espacios (Caso 17: "saldos separados por espacio; no se compensan entre sí"),
 * así que no hay ningún total general.
 */
export function SpaceList({ spaces }: { spaces: readonly SpaceSummary[] }) {
  return (
    <Stack gap="3">
      {spaces.map((space, index) => (
        <Animated.View
          key={space.id}
          entering={FadeInDown.delay(stagger(index, 60)).duration(duration.base)}
        >
          <SpaceCardContainer space={space} />
        </Animated.View>
      ))}
    </Stack>
  );
}

/** El container: trae el saldo y los pendientes de UN espacio con el dominio. */
function SpaceCardContainer({ space }: { space: SpaceSummary }) {
  const openSpace = useOpenSpace();

  // El saldo de cada espacio se calcula con el dominio, igual que adentro: no
  // hay dos fuentes para la misma cifra.
  const { derived, isLoading, today } = useSpace(space.id);
  const pendings = useSpacePendings(space.id, derived, today);

  // §24 · el estado del otro miembro.
  let note: string | null = null;
  if (space.otherIsFormer) note = `${space.otherMemberName} · ex miembro`;
  else if (!space.otherHasAccess) note = `${space.otherMemberName} todavía no entró`;

  return (
    <SpaceCard
      name={space.name}
      scale={
        derived == null ? null : (
          <SpaceBalanceScale
            size="mini"
            spaceId={space.id}
            balance={derived.balance}
            myName={derived.me.displayName}
            other={derived.other}
          />
        )
      }
      loading={isLoading}
      sentence={derived == null ? null : balanceSentence(derived.balance)}
      settled={derived?.balance.settled ?? false}
      pill={pendingPill(pendings.total)}
      note={note}
      onPress={() => openSpace(space.id)}
    />
  );
}
