import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { DeletedRecord } from '@domain/types';
import { formatDayMonth, formatPesos } from '@/lib/format';
import {
  Avatar,
  ContributionBar,
  Money,
  Pressable,
  Row,
  RowChevron,
  Stack,
  Text,
  TextLink,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * Las filas y barras de las pantallas del espacio (§24). Presentacionales:
 * reciben todo por props; las pantallas deciden qué mostrar.
 */

/**
 * §24 · la barra de lo que puso cada uno, con la marca de su parte.
 *
 * "Parte" y no "le corresponde" (decisión del 10/10): en la pantalla de las
 * deudas, "te corresponden $350.000" se leía como plata que te deben. "Parte"
 * es el sinónimo exacto del glosario (§7.2).
 */
export function MemberContribution({
  name,
  initial,
  put,
  share,
  max,
  tone,
  index,
}: {
  name: string;
  initial: string;
  put: number;
  share: number;
  max: number;
  tone: 'viewer' | 'other';
  index: number;
}) {
  const isViewer = tone === 'viewer';

  return (
    <Stack gap="2">
      <Row justify="space-between" align="center">
        <Row gap="2" align="center">
          <Avatar initial={initial} tone={isViewer ? 'me' : 'other'} size={26} />
          <Text variant="small" tone="secondary">
            {isViewer ? 'Pusiste' : `${name} puso`}
          </Text>
        </Row>
        <Money amount={put} variant="smallMedium" numberOfLines={1} />
      </Row>

      <ContributionBar put={put} share={share} max={max} tone={tone} index={index} />

      <Row justify="flex-end">
        <Text variant="caption" tone="muted">
          {isViewer ? 'tu parte ' : 'su parte '}
        </Text>
        <Money amount={share} variant="caption" tone="muted" />
      </Row>
    </Stack>
  );
}

/**
 * La barra de dos tramos de la puerta del mes: lo que puso cada uno ESE mes.
 * Decorativa para el lector de pantalla: la puerta ya dice las cifras.
 */
export function PutSplitBar({ me, other }: { me: number; other: number }) {
  const theme = useTheme();
  return (
    <View
      accessible={false}
      style={{
        flexDirection: 'row',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        gap: 2,
        backgroundColor: theme.colors.surfaceSunken,
        marginTop: theme.space['1'],
      }}
    >
      {me > 0 && <View style={{ flex: me, backgroundColor: theme.colors.shared }} />}
      {other > 0 && <View style={{ flex: other, backgroundColor: theme.colors.committed }} />}
    </View>
  );
}

/**
 * Opción B · el rastro de algo que eliminó el otro. Tachado y en gris: ya no
 * cuenta en ningún número, y se dice qué era para que se entienda el cambio.
 */
export function DeletedRow({
  item,
  label,
  tag,
  onReviewed,
}: {
  item: DeletedRecord;
  label: string;
  tag: string;
  onReviewed: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ paddingVertical: theme.space['3'], gap: 3 }}>
      <Row gap="3" align="flex-start">
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text
            variant="bodyMedium"
            tone="muted"
            numberOfLines={1}
            style={{ textDecorationLine: 'line-through' }}
          >
            {label}
          </Text>
          {item.occurredOn != null && (
            <Text variant="caption" tone="muted">
              {formatDayMonth(item.occurredOn)}
            </Text>
          )}
          <ReviewTag label={tag} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {item.amount != null && (
            <Text
              variant="bodyMedium"
              tone="muted"
              tabular
              numberOfLines={1}
              style={{ textDecorationLine: 'line-through' }}
            >
              {formatPesos(item.amount)}
            </Text>
          )}
          <TextLink label="Está bien" variant="smallMedium" onPress={onReviewed} />
        </View>
      </Row>
    </View>
  );
}

/** Opción B · la marca de "para revisar": un punto y quién lo cargó. */
export function ReviewTag({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Row gap="2" align="center">
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.shared }}
      />
      <Text variant="caption" tone="shared">
        {label}
      </Text>
    </Row>
  );
}

/**
 * Una fila de las pantallas de detalle del espacio (N3): ícono, título, líneas
 * de apoyo y monto. Sirve para movimientos, pagos, categorías y lo que se viene.
 *
 * La fecha NO va en la fila: la da el encabezado del día. "tu parte" va en gris
 * a la derecha, bajo el monto, y no en una línea propia. Solo la fila que abre
 * algo lleva chevron (UX-11).
 */
export function LedgerRow({
  icon: Icon,
  title,
  caption = null,
  authorship = null,
  reviewTag = null,
  amount = null,
  myShare = null,
  muted = false,
  onPress,
}: {
  icon?: LucideIcon;
  title: string;
  /** Lo que el título no dice: "pagó Martina · cuota 2 de 6". */
  caption?: string | null;
  /** K3 · "Lo cargó Martina · lo editaste vos". */
  authorship?: string | null;
  /** Opción B · "Lo cargó Martina · para revisar". */
  reviewTag?: string | null;
  amount?: number | null;
  myShare?: number | null;
  muted?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const row = (
    <Row gap="3" align="flex-start">
      {Icon != null && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceSunken,
          }}
        >
          <Icon size={16} color={theme.colors.textSecondary} />
        </View>
      )}

      {/* Lo de la izquierda cede antes de empujar el monto (Montos · 11). */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="bodyMedium" numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        {caption != null && (
          <Text variant="caption" tone="muted" numberOfLines={2} ellipsizeMode="tail">
            {caption}
          </Text>
        )}
        {/* La marca de revisar ya dice quién lo cargó: no se repite. */}
        {reviewTag != null ? (
          <ReviewTag label={reviewTag} />
        ) : (
          authorship != null && (
            <Text variant="caption" tone="muted">
              {authorship}
            </Text>
          )
        )}
      </View>

      {amount != null && (
        <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <Money
            amount={amount}
            variant="bodyMedium"
            numberOfLines={1}
            tone={muted ? 'muted' : 'default'}
          />
          {myShare != null && (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              tu parte <Money amount={myShare} variant="caption" tone="muted" />
            </Text>
          )}
        </View>
      )}

      {/* UX-11 · solo la fila que abre algo lleva chevron. */}
      {onPress != null && (
        <View style={{ marginTop: 3 }}>
          <RowChevron />
        </View>
      )}
    </Row>
  );

  if (onPress == null) {
    return <View style={{ paddingVertical: theme.space['3'] }}>{row}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={[title, caption, authorship].filter((part) => part != null).join('. ')}
      // 44pt: el área mínima tocable (HIG), aunque la fila tenga una sola línea.
      style={{ paddingVertical: theme.space['3'], minHeight: 44 }}
    >
      {row}
    </Pressable>
  );
}
