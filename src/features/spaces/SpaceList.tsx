import { useOpenSpace } from './useOpenSpace';
import { ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import type { SpaceSummary } from '@/data/repositories/spaces';
import { Card, Pressable, Row, Skeleton, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { useSpace } from './useSpaces';
import { balanceSentence } from './balanceCopy';

/**
 * La lista de espacios. §14 · "Compartidos: lista de espacios → cada espacio;
 * con uno solo, entra directo."
 *
 * K1 · un usuario puede tener varios, "con poco protagonismo en la UX": de ahí
 * que sea una lista sobria y no un tablero. Y los saldos no se suman entre
 * espacios (Caso 17: "saldos separados por espacio; no se compensan entre sí"),
 * así que no hay ningún total general.
 */
export function SpaceList({ spaces }: { spaces: readonly SpaceSummary[] }) {
  const theme = useTheme();

  return (
    <Stack gap="3">
      {spaces.map((space, index) => (
        <Animated.View
          key={space.id}
          entering={FadeInDown.delay(stagger(index, 60)).duration(duration.base)}
        >
          <SpaceRow space={space} />
        </Animated.View>
      ))}
    </Stack>
  );
}

function SpaceRow({ space }: { space: SpaceSummary }) {
  const theme = useTheme();
  const openSpace = useOpenSpace();

  // El saldo de cada espacio se calcula con el dominio, igual que adentro: no
  // hay dos fuentes para la misma cifra.
  const { derived, isLoading } = useSpace(space.id);

  return (
    <Pressable
      onPress={() => openSpace(space.id)}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={space.name}
    >
      <Card>
        <Row gap="3" align="center">
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="bodyMedium">{space.name}</Text>

            {isLoading ? (
              <Skeleton width={140} height={13} />
            ) : derived != null ? (
              <Text
                variant="small"
                tone={derived.balance.settled ? 'muted' : 'shared'}
              >
                {balanceSentence(derived.balance)}
              </Text>
            ) : null}

            {/* §24 · el estado del otro miembro. */}
            {space.otherHasAccess === false && space.otherIsFormer === false && (
              <Text variant="caption" tone="muted">
                {space.otherMemberName} todavía no entró
              </Text>
            )}
            {space.otherIsFormer && (
              <Text variant="caption" tone="muted">
                {space.otherMemberName} · ex miembro
              </Text>
            )}
          </View>

          <ChevronRight size={16} color={theme.colors.textMuted} />
        </Row>
      </Card>
    </Pressable>
  );
}
