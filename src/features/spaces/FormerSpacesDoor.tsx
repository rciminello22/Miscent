import { useRouter, type Href } from 'expo-router';
import { History } from 'lucide-react-native';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { Door } from '@/ui/primitives';
import { formerSpacesCaption, listFormerSpaces } from './formerSpaces';
import { formerSpacesHref } from './spaceNavigation';

/**
 * P26 · la puerta (N2) "Espacios que dejaste" al final de la lista de espacios:
 * antes cada uno era una tarjeta suelta en la lista y se acumulaban. Borde
 * punteado, que es lo que ya no está activo. No existe si no dejaste ninguno.
 */
export function FormerSpacesDoor() {
  const router = useRouter();
  const { accountState } = useSession();
  const { facts, today } = usePersonalFacts();

  const count = listFormerSpaces(facts, today).length;
  if (count === 0) return null;

  return (
    <Door
      icon={History}
      title="Espacios que dejaste"
      caption={formerSpacesCaption(count)}
      dashed
      onPress={() =>
        router.push(formerSpacesHref(accountState === 'personal' ? 'personal' : 'guest') as Href)
      }
    />
  );
}
