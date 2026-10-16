import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import type { SpaceSummary } from '@/data/repositories/spaces';
import { useSession } from '@/features/auth/SessionProvider';
import { spacesDoorCaption } from '@/features/home/homeDoorsCopy';
import { Avatar, Door, Skeleton } from '@/ui/primitives';
import { balanceSentence } from './balanceCopy';
import { initialOf } from './balanceScaleState';
import { PairAvatars } from './PairAvatars';
import { pendingPill } from './spaceListCopy';
import { useOpenSpace } from './useOpenSpace';
import { useSpacePendings } from './useSpacePendings';
import { useSpace, useSpaces } from './useSpaces';
import { useRouter } from 'expo-router';

/**
 * §15 · Tus espacios, como una puerta (N2) de Inicio.
 *
 * Con uno solo: sus dos avatares y la frase del saldo ("Martina te debe
 * $20.000"); abre el espacio. Con varios, UNA sola puerta que los resume y abre
 * la lista de Compartidos: los saldos nunca se suman entre espacios (Caso 17).
 * Sin espacios, el bloque no aparece.
 *
 * Es el saldo compartido, el ÚNICO "saldo" que existe en la app (§7.2).
 */
export function SpacesOnHome() {
  const { data: spaces } = useSpaces();
  if (spaces == null || spaces.length === 0) return null;

  const [only] = spaces;
  return spaces.length === 1 && only != null ? (
    <SingleSpaceDoor space={only} />
  ) : (
    <SeveralSpacesDoor spaces={spaces} />
  );
}

function SingleSpaceDoor({ space }: { space: SpaceSummary }) {
  const openSpace = useOpenSpace();
  const { profile } = useSession();
  // El mismo cálculo que adentro del espacio: una sola fuente para la cifra.
  const { derived, isLoading, today } = useSpace(space.id);
  const pendings = useSpacePendings(space.id, derived, today);
  const pill = pendingPill(pendings.total);
  const sentence = derived == null ? null : balanceSentence(derived.balance);

  return (
    <Door
      icon={Users}
      title={space.name}
      caption={isLoading || sentence == null ? null : [sentence, pill].filter(Boolean).join(' · ')}
      attention={pendings.total > 0 ? 'attention' : 'none'}
      accessibilityLabel={[space.name, sentence, pill].filter((part) => part != null).join('. ')}
      trailing={
        <PairAvatars
          myName={profile?.displayName ?? 'Vos'}
          otherName={space.otherMemberName}
          otherDashed={!space.otherHasAccess}
        />
      }
      onPress={() => openSpace(space.id)}
    >
      {isLoading && <Skeleton width={140} height={13} />}
    </Door>
  );
}

function SeveralSpacesDoor({ spaces }: { spaces: readonly SpaceSummary[] }) {
  const router = useRouter();
  const caption = spacesDoorCaption(spaces.length);

  return (
    <Door
      icon={Users}
      title="Tus espacios"
      caption={caption}
      trailing={
        <View style={{ flexDirection: 'row' }}>
          {spaces.slice(0, 3).map((space, index) => (
            <View key={space.id} style={{ marginLeft: index === 0 ? 0 : -8 }}>
              <Avatar
                initial={initialOf(space.otherMemberName)}
                tone="other"
                dashed={!space.otherHasAccess}
                size={28}
              />
            </View>
          ))}
        </View>
      }
      onPress={() => router.push('/(personal)/compartidos')}
    />
  );
}
