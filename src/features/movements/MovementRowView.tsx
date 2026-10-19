import { View } from 'react-native';
import { ArrowRightLeft, CalendarClock, Layers, Wallet, type LucideIcon } from 'lucide-react-native';
import { formatPesos } from '@/lib/format';
import { categoryMeta, prettyLabel } from '@/features/add/categories';
import {
  AudienceIcon,
  Divider,
  Money,
  Pressable,
  Row,
  RowChevron,
  Text,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { MovementRow } from './buildMovementList';
import { rowDetail, type DayGroup } from './movementsView';

const EFFECT_ICON: Record<'installments' | 'card' | 'income', LucideIcon> = {
  installments: Layers,
  card: CalendarClock,
  income: Wallet,
};

/**
 * Una fila de Movimientos, compacta: ícono de categoría, título con el ícono de
 * audiencia (§12), el monto y, solo si agrega algo, una segunda línea. La fecha
 * la da el encabezado del día.
 *
 * De un gasto compartido la cifra principal es TU PARTE y el total va en gris
 * ("de $100.000"): las dos lentes de §7.3 no se mezclan (K9).
 */
export function MovementRowView({
  row,
  showSpace,
  onPress,
  onLongPress,
}: {
  row: MovementRow;
  /** Falso dentro de la lista de un espacio, donde su nombre sobra. */
  showSpace: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const detail = rowDetail(row, { showSpace });
  const isPayment = row.kind === 'member-payment';
  const isIncome = row.kind === 'personal-income';
  // SA-02 · de un espacio del que saliste no hay detalle: la fila es informativa
  // y no lleva chevron ni rol de botón (UX-11).
  const opensDetail = !row.formerSpace;

  const CategoryIcon = row.category != null ? categoryMeta(row.category).icon : ArrowRightLeft;
  const EffectIcon = detail.effect != null ? EFFECT_ICON[detail.effect.kind] : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole={opensDetail ? 'button' : undefined}
      accessibilityLabel={prettyLabel(row.label)}
      style={{ paddingVertical: theme.space['3'] }}
    >
      <Row gap="3" align="flex-start">
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceSunken,
          }}
        >
          <CategoryIcon size={18} color={theme.colors.textSecondary} />
        </View>

        {/* Lo de la izquierda cede antes de empujar el monto (Montos · 11). */}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Row gap="2" align="center">
            <Text
              variant="bodyMedium"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ flexShrink: 1 }}
            >
              {prettyLabel(row.label)}
            </Text>
            {/* §12 · el ícono de una o dos personas en cada fila. */}
            <AudienceIcon audience={row.audience} size={12} />
          </Row>

          {detail.caption != null && (
            <Text variant="caption" tone="muted" numberOfLines={1} ellipsizeMode="tail">
              {detail.caption}
            </Text>
          )}

          {detail.effect != null && EffectIcon != null && (
            <Row gap="1" align="center">
              <EffectIcon size={12} color={theme.colors.textMuted} />
              <Text
                variant="caption"
                tone="muted"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flexShrink: 1 }}
              >
                {detail.effect.text}
              </Text>
            </Row>
          )}

          {/* Opción B · lo que cargó el otro y no revisaste: se revisa en el espacio. */}
          {row.reviewTag != null && (
            <Row gap="2" align="center">
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.colors.shared,
                }}
              />
              <Text
                variant="caption"
                tone="shared"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flexShrink: 1 }}
              >
                {row.reviewTag}
              </Text>
            </Row>
          )}
        </View>

        {/* El monto nunca se corta: no se encoge (flexShrink 0) y va en una línea. */}
        <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <Money
            amount={row.amount}
            variant="bodyMedium"
            numberOfLines={1}
            tone={isIncome ? 'brand' : isPayment ? 'shared' : 'default'}
          />
          {/* §16 · el total del gasto compartido, en gris. */}
          {row.total != null && row.total !== row.amount && (
            <Text variant="caption" tone="muted" tabular numberOfLines={1}>
              de {formatPesos(row.total)}
            </Text>
          )}
        </View>

        {/* UX-11 · la fila abre el detalle. */}
        {opensDetail && (
          <View style={{ marginTop: 8 }}>
            <RowChevron />
          </View>
        )}
      </Row>
    </Pressable>
  );
}

/**
 * La lista agrupada por día: un encabezado (`overline`) por fecha y sus filas.
 * Fondo plano, sin tarjetas: es un N3 con pestaña propia (excepción declarada
 * para las listas que SON la pantalla).
 */
export function MovementDayList({
  groups,
  showSpace,
  onOpen,
  onLongPress,
}: {
  groups: readonly DayGroup[];
  showSpace: boolean;
  onOpen: (row: MovementRow) => void;
  onLongPress?: (row: MovementRow) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space['4'] }}>
      {groups.map((group) => (
        <View key={group.date}>
          <Text variant="overline" tone="muted" accessibilityRole="header">
            {group.heading}
          </Text>
          {group.rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 && <Divider />}
              <MovementRowView
                row={row}
                showSpace={showSpace}
                onPress={() => onOpen(row)}
                onLongPress={onLongPress == null ? undefined : () => onLongPress(row)}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
