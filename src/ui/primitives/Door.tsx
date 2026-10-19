import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Pressable } from './Pressable';
import { RowChevron } from './RowChevron';
import { Text } from './Text';

/**
 * Una puerta (N2): lo que sostiene la respuesta de la pantalla y abre su
 * detalle (N3). Ícono, título, a veces UNA cifra o una frase corta y un mini
 * gráfico, y chevron. Toda la tarjeta se toca.
 *
 * Una puerta nunca contiene una lista ni un párrafo. Tarjeta blanca con borde
 * fino: es la única superficie de N2, así que "tarjeta blanca con chevron =
 * puerta".
 *
 * `attention` marca algo que espera a la persona: borde de acento y un punto.
 * `urgent` es lo que no puede quedar escondido (SA-04): además, fondo teñido.
 */
export function Door({
  icon: Icon,
  glyph,
  iconTone = 'neutral',
  title,
  titleAside,
  value,
  caption,
  attention = 'none',
  dashed = false,
  trailing,
  onPress,
  accessibilityLabel,
  children,
}: {
  /** El ícono de la caja. Sin él, va `glyph`. */
  icon?: LucideIcon;
  /** Un dibujo propio en lugar del ícono: la balanza mini de un espacio. */
  glyph?: ReactNode;
  /** `shared` tiñe la caja del acento de lo compartido. */
  iconTone?: 'neutral' | 'shared';
  title: string;
  /** Algo junto al título: la pastilla "2 por revisar". */
  titleAside?: ReactNode;
  /** La cifra de la puerta: lo más grande del bloque. */
  value?: string | null;
  caption?: string | null;
  attention?: 'none' | 'attention' | 'urgent' | 'excess';
  /** Borde punteado: lo que ya no está activo (un espacio con un ex miembro). */
  dashed?: boolean;
  /** Algo a la derecha, antes del chevron: los avatares de un espacio. */
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Un mini gráfico (una barra), nunca una lista. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const flagged = attention !== 'none';
  // `excess` (N-08) es ámbar y sin alarma; el resto de la atención es el acento de lo compartido.
  const accent = attention === 'excess' ? theme.colors.excess : theme.colors.shared;

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? [title, value, caption].filter((part) => part != null && part !== '').join('. ')
      }
      style={{
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['3'],
        paddingVertical: theme.space['3'],
        paddingHorizontal: theme.space['4'],
        borderRadius: theme.radius.lg,
        borderWidth: flagged ? 1.5 : 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: flagged ? accent : dashed ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: attention === 'urgent' ? theme.colors.sharedSoft : theme.colors.surface,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            (flagged && attention !== 'excess') || iconTone === 'shared'
              ? theme.colors.sharedSoft
              : theme.colors.surfaceSunken,
        }}
      >
        {glyph ?? (Icon != null && <Icon size={20} color={flagged ? accent : theme.colors.textSecondary} />)}
      </View>

      {/* Lo de la izquierda cede antes de empujar lo de la derecha (Montos · 11). */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {titleAside == null ? (
          <Text variant="bodyMedium">{title}</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space['2'] }}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {title}
            </Text>
            {titleAside}
          </View>
        )}
        {value != null && (
          <Text variant="heading" tabular style={{ flexShrink: 1 }}>
            {value}
            {caption != null && (
              <Text variant="caption" tone="muted">
                {' '}
                {caption}
              </Text>
            )}
          </Text>
        )}
        {value == null && caption != null && caption !== '' && (
          <Text variant="caption" tone="muted">
            {caption}
          </Text>
        )}
        {children}
      </View>

      {trailing}

      {flagged && (
        <View
          testID="door-attention"
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }}
        />
      )}
      <RowChevron />
    </Pressable>
  );
}
