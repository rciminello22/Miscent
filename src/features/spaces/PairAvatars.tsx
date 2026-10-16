import { View } from 'react-native';
import { Avatar } from '@/ui/primitives';
import { initialOf } from './balanceScaleState';

/**
 * Dos círculos con iniciales, superpuestos: vos y el otro (punteado si todavía
 * no entró). K7 · iniciales, nunca foto ni email.
 */
export function PairAvatars({
  myName,
  otherName,
  otherDashed,
  size = 28,
}: {
  myName: string;
  otherName: string;
  otherDashed: boolean;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <Avatar initial={initialOf(myName)} tone="me" size={size} />
      <View style={{ marginLeft: -8 }}>
        <Avatar initial={initialOf(otherName)} tone="other" dashed={otherDashed} size={size} />
      </View>
    </View>
  );
}
