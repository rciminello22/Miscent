import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ClipboardCheck, Plus } from 'lucide-react-native';
import type { SpaceSummary } from '@/data/repositories/spaces';
import { Card, Pressable, Row, RowChevron, Skeleton, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { useSpace } from './useSpaces';
import { useOpenSpace } from './useOpenSpace';
import { useSpacePendings } from './useSpacePendings';
import { balanceSentence } from './balanceCopy';
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

/**
 * "Crear otro espacio": una tarjeta con borde punteado al final de la lista.
 * Baja jerarquía a propósito (K1): no es un botón lleno que compita con los espacios.
 */
export function CreateSpaceCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel="Crear otro espacio"
      style={{
        minHeight: 56,
        borderRadius: theme.radius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderStrong,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space['2'],
      }}
    >
      <Plus size={16} color={theme.colors.textSecondary} />
      <Text variant="bodyMedium" tone="secondary">
        Crear otro espacio
      </Text>
    </Pressable>
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
      loading={isLoading}
      sentence={derived == null ? null : balanceSentence(derived.balance)}
      settled={derived?.balance.settled ?? false}
      pill={pendingPill(pendings.total)}
      note={note}
      onPress={() => openSpace(space.id)}
    />
  );
}

/**
 * La tarjeta de un espacio en la lista: una puerta N2 (blanca, con borde y
 * chevron). Presentacional: recibe todo por props.
 */
export function SpaceCard({
  name,
  sentence,
  settled,
  pill,
  note,
  loading = false,
  onPress,
}: {
  name: string;
  /** La frase del saldo (`balanceSentence`); null mientras carga. */
  sentence: string | null;
  settled: boolean;
  /** "2 por revisar", si hay algo pendiente. */
  pill: string | null;
  /** "Martina todavía no entró" / "Martina · ex miembro". */
  note: string | null;
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={[name, sentence, pill, note].filter((part) => part != null).join('. ')}
    >
      <Card>
        <Stack gap="3">
          <Row justify="space-between" align="center" gap="3">
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            {pill != null && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space['1'],
                  paddingHorizontal: theme.space['2'],
                  paddingVertical: 3,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.sharedSoft,
                }}
              >
                <ClipboardCheck size={13} color={theme.colors.shared} />
                <Text variant="caption" tone="shared">
                  {pill}
                </Text>
              </View>
            )}
          </Row>

          <Row justify="space-between" align="center" gap="3">
            <View style={{ flex: 1, gap: 2 }}>
              {loading || sentence == null ? (
                <Skeleton width={140} height={16} />
              ) : (
                <Text variant="bodyMedium" tone={settled ? 'muted' : 'shared'}>
                  {sentence}
                </Text>
              )}
              {note != null && (
                <Text variant="caption" tone="muted">
                  {note}
                </Text>
              )}
            </View>
            <RowChevron />
          </Row>
        </Stack>
      </Card>
    </Pressable>
  );
}
