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
  title,
  value,
  caption,
  attention = 'none',
  trailing,
  onPress,
  accessibilityLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** La cifra de la puerta: lo más grande del bloque. */
  value?: string | null;
  caption?: string | null;
  attention?: 'none' | 'attention' | 'urgent' | 'excess';
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
        borderColor: flagged ? accent : theme.colors.border,
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
            flagged && attention !== 'excess' ? theme.colors.sharedSoft : theme.colors.surfaceSunken,
        }}
      >
        <Icon size={20} color={flagged ? accent : theme.colors.textSecondary} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium">{title}</Text>
        {value != null && (
          <Text variant="heading" tabular>
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
