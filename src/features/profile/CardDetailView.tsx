import { View } from 'react-native';
import { CreditCard, Pencil, X } from 'lucide-react-native';
import type { PaymentMethod } from '@domain/types';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatMonthShort, formatPesos } from '@/lib/format';
import { ESTIMATE_NOTE } from '@/features/upcoming/statementDetail';
import {
  AudienceBadge,
  Button,
  Card,
  Door,
  IconButton,
  Money,
  Row,
  Screen,
  Stack,
  Text,
  TextLink,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { CardEditForm, type CardEditFormProps } from './CardEditForm';
import type { CardGroupDoor, StatementBar } from './cardOverview';

/** El alto de la barra del mayor vencimiento, en px. */
const BAR_HEIGHT = 56;

/**
 * P24 · el detalle de una tarjeta: N1 con su próximo resumen estimado (N-10) y
 * las barras de los próximos vencimientos, el cierre y el vencimiento como
 * pastillas, y las puertas Compras, Cuotas y Fijos. El lápiz (y "Ya sé el día
 * exacto", cuando hay días aproximados) abre la misma edición del nombre, el
 * cierre y el vencimiento; "Eliminar tarjeta" va al pie. Presentacional: el
 * container arma todo.
 *
 * C-05 · solo en lo personal ("Solo vos"). T-01 · nunca número, límite, pago
 * mínimo ni intereses.
 */
export function CardDetailView({
  card,
  pills,
  nextLine,
  next,
  bars,
  doors,
  editing,
  form,
  canSave,
  saving,
  onKnowExactDay,
  onEdit,
  onCancelEdit,
  onSave,
  onOpenStatement,
  onOpenDoor,
  onDelete,
  onClose,
}: {
  card: PaymentMethod;
  pills: readonly [string, string];
  /** La línea del próximo resumen (`cardDoorLine`). */
  nextLine: string;
  next: UpcomingPayment | null;
  bars: readonly StatementBar[];
  doors: readonly CardGroupDoor[];
  editing: boolean;
  /** El formulario de edición; solo se muestra con `editing`. */
  form: CardEditFormProps;
  canSave: boolean;
  saving: boolean;
  /** "Ya sé el día exacto": solo cuando algún día es aproximado. */
  onKnowExactDay?: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onOpenStatement: () => void;
  onOpenDoor: (kind: CardGroupDoor['kind']) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen
      footer={
        editing ? (
          <Stack gap="2">
            <Button
              label="Guardar cambios"
              size="lg"
              fullWidth
              haptic="success"
              disabled={!canSave}
              loading={saving}
              onPress={onSave}
            />
            <Button
              label="Cancelar"
              variant="ghost"
              fullWidth
              haptic="none"
              onPress={onCancelEdit}
            />
          </Stack>
        ) : undefined
      }
    >
      <Stack gap="6">
        <Row justify="space-between" align="center" gap="3">
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {card.name}
          </Text>
          {!editing && (
            <IconButton
              label="Editar"
              onPress={onEdit}
              icon={<Pencil size={16} color={theme.colors.textSecondary} />}
            />
          )}
          <IconButton
            label="Cerrar"
            onPress={onClose}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <Row gap="2" align="center" style={{ flexWrap: 'wrap' }}>
          <AudienceBadge audience={{ kind: 'private' }} />
          {pills.map((pill) => (
            <DayPill key={pill} text={pill} />
          ))}
        </Row>

        {!editing && onKnowExactDay != null && (
          <TextLink label="Ya sé el día exacto" onPress={onKnowExactDay} />
        )}

        {editing ? (
          <CardEditForm {...form} />
        ) : (
          <>
            <Card>
              <Stack gap="4">
                <Stack gap="1">
                  <Text variant="small" tone="secondary">
                    Próximo resumen
                  </Text>
                  {next != null ? (
                    <>
                      <Money amount={next.amount} variant="display" />
                      <Text variant="small" tone="secondary">
                        {nextLine.replace(/ · [^·]*$/, '')}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {ESTIMATE_NOTE}
                      </Text>
                    </>
                  ) : (
                    <Text variant="body" tone="secondary">
                      {nextLine}
                    </Text>
                  )}
                </Stack>

                {bars.length > 0 && <StatementBars bars={bars} />}

                {next != null && <TextLink label="Ver qué incluye" onPress={onOpenStatement} />}
              </Stack>
            </Card>

            {doors.length > 0 && (
              <Stack gap="3">
                {doors.map((door) => (
                  <Door
                    key={door.kind}
                    icon={CreditCard}
                    title={door.title}
                    caption={`${door.count} · ${formatPesos(door.subtotal)}`}
                    accessibilityLabel={`${door.title}. ${door.count}`}
                    onPress={() => onOpenDoor(door.kind)}
                  />
                ))}
              </Stack>
            )}

            <Button
              label="Eliminar tarjeta"
              variant="destructive"
              fullWidth
              haptic="none"
              onPress={onDelete}
            />
          </>
        )}
      </Stack>
    </Screen>
  );
}

function DayPill({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: theme.space['3'],
        paddingVertical: 4,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceSunken,
      }}
    >
      <Text variant="caption" tone="secondary">
        {text}
      </Text>
    </View>
  );
}

/** Las barras de los próximos vencimientos, con el mes debajo. */
function StatementBars({ bars }: { bars: readonly StatementBar[] }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.space['4'] }}
    >
      {bars.map((bar) => (
        <View key={bar.month} style={{ alignItems: 'center', gap: 4 }}>
          <View
            testID={`statement-bar-${bar.month}`}
            style={{
              width: 28,
              height: Math.max(4, BAR_HEIGHT * bar.ratio),
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              backgroundColor: theme.colors.committed,
            }}
          />
          <Text variant="caption" tone="muted">
            {formatMonthShort(bar.month)}
          </Text>
        </View>
      ))}
    </View>
  );
}
