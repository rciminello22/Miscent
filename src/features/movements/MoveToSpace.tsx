import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import type { PersonalMovement } from '@domain/types';
import { halve } from '@domain/money';
import { formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { movePersonalToSpace } from '@/data/repositories/edits';
import { useSession } from '@/features/auth/SessionProvider';
import { useSpaces } from '@/features/spaces/useSpaces';
import {
  Card,
  Divider,
  Money,
  Pressable,
  Row,
  RowChevron,
  Sheet,
  Stack,
  Text,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * X-07 · cambiar el destino de un gasto: de personal a un espacio.
 *
 * "Solo lo puede hacer quien lo cargó, con confirmación de audiencia."
 *
 * Lo primero lo garantiza RLS (un movimiento personal solo lo ve su dueño).
 * Lo segundo es trabajo de esta hoja, y no es un detalle: el gasto pasa a ser
 * visible para otra persona, y §32 clasifica como "**rompe privacidad**" que
 * eso ocurra por error. Por eso la confirmación nombra a la persona que lo va
 * a ver, en vez de preguntar un genérico "¿estás seguro?".
 *
 * El reparto arranca en 50/50 y se ajusta después desde el espacio: X-01
 * permite editarlo y recalcula todo. Pedir el reparto fino acá sumaría una
 * pantalla a una acción que es, sobre todo, una corrección.
 */
export function MoveToSpace({
  visible,
  onClose,
  movement,
  onMoved,
}: {
  visible: boolean;
  onClose: () => void;
  movement: PersonalMovement;
  onMoved: (spaceId: string) => void;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: spaces } = useSpaces();
  const [moving, setMoving] = useState(false);

  const shares = halve(movement.amount);

  const move = useMutation({
    mutationFn: (args: { spaceId: string; mySlot: 1 | 2 }) =>
      movePersonalToSpace({
        movement,
        spaceId: args.spaceId,
        mySlot: args.mySlot,
        split: { mode: 'even' },
        // C-05 · el medio de pago sigue siendo privado de quien pagó, así que
        // viaja con el gasto pero no se vuelve visible para el otro.
        keepPaymentMethod: true,
      }),
    onSuccess: async (_id, args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.spaces }),
        queryClient.invalidateQueries({ queryKey: queryKeys.spaceFacts(args.spaceId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
        }),
      ]);
      setMoving(false);
      onClose();
      onMoved(args.spaceId);
    },
    onError: (error: Error) => {
      setMoving(false);
      Alert.alert('No pudimos moverlo', error.message);
    },
  });

  function confirm(spaceId: string, spaceName: string, otherName: string, mySlot: 1 | 2) {
    // La confirmación de audiencia nombra a quien lo va a ver.
    Alert.alert(
      `¿Moverlo a ${spaceName}?`,
      `${otherName} va a ver este gasto: el monto, la fecha y la categoría. Se reparte 50/50, y el reparto lo podés cambiar después desde el espacio.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Moverlo',
          onPress: () => {
            setMoving(true);
            void move.mutateAsync({ spaceId, mySlot });
          },
        },
      ],
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Moverlo a un espacio">
      <Stack gap="5">
        <Card tone="sunken">
          <Stack gap="2">
            <Text variant="small" tone="secondary">
              Hoy este gasto lo ves solo vos. Si lo movés a un espacio, la otra persona lo
              va a ver y se va a repartir entre los dos.
            </Text>
            <Row gap="2" align="baseline">
              <Text variant="caption" tone="muted">
                Con 50/50, tu parte sería
              </Text>
              <Money amount={shares.slot1} variant="caption" />
            </Row>
          </Stack>
        </Card>

        {(spaces ?? []).length === 0 ? (
          <Text variant="small" tone="secondary">
            Todavía no tenés espacios compartidos.
          </Text>
        ) : (
          <Stack gap="0">
            {(spaces ?? []).map((space, index) => (
              <View key={space.id}>
                <Pressable
                  onPress={() =>
                    confirm(space.id, space.name, space.otherMemberName, space.mySlot)
                  }
                  scaleOnPress={false}
                  accessibilityRole="button"
                  accessibilityLabel={space.name}
                  style={{ paddingVertical: theme.space['4'], opacity: moving ? 0.5 : 1 }}
                >
                  <Row gap="3" align="center">
                    <Users size={17} color={theme.colors.shared} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyMedium">{space.name}</Text>
                      <Text variant="caption" tone="muted">
                        lo va a ver {space.otherMemberName}
                      </Text>
                    </View>
                    {/* UX-11 · la fila elige el espacio. */}
                    <RowChevron />
                  </Row>
                </Pressable>
                {index < (spaces ?? []).length - 1 && <Divider />}
              </View>
            ))}
          </Stack>
        )}

        <Text variant="caption" tone="muted">
          {formatPesos(movement.amount)} ·{' '}
          {movement.installments != null
            ? `${movement.installments.count} cuotas, que se mantienen`
            : 'un solo pago'}
        </Text>
      </Stack>
    </Sheet>
  );
}
