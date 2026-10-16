import { View } from 'react-native';
import { ClipboardCheck, Plus, Users } from 'lucide-react-native';
import { BalanceGlyph, Door, Pressable, Skeleton, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { PairAvatars } from './PairAvatars';
import type { SpaceRowModel } from './spaceRow';

/**
 * 3ii · la fila de un espacio en la lista de Compartidos: la misma puerta (N2)
 * que "Tus espacios" de Inicio. En la caja del ícono, la balanza mini (inclinada
 * hacia quien puso de más, o nivelada con tilde); después el nombre, la pastilla
 * "N por revisar", la frase del saldo, los avatares superpuestos y el chevron.
 *
 * Presentacional: recibe la fila armada (`buildSpaceRow`); el container
 * (`SpaceList`) trae los datos.
 */
export function SpaceCard({ row, onPress }: { row: SpaceRowModel; onPress: () => void }) {
  return (
    <Door
      // Un ex miembro: la fila con borde punteado y la balanza apagada.
      dashed={row.former}
      iconTone={row.former ? 'neutral' : 'shared'}
      icon={row.glyph == null ? Users : undefined}
      glyph={
        row.glyph == null ? undefined : (
          <BalanceGlyph
            direction={row.glyph.direction}
            showCheck={row.glyph.showCheck}
            label={row.glyph.label}
            muted={row.former}
          />
        )
      }
      title={row.name}
      titleAside={row.pill == null ? undefined : <PendingPill text={row.pill} />}
      accessibilityLabel={row.accessibilityLabel}
      trailing={
        <PairAvatars
          myName={row.myName}
          otherName={row.otherName}
          otherDashed={row.otherDashed}
          size={28}
        />
      }
      onPress={onPress}
    >
      {row.loading || row.sentence == null ? (
        <Skeleton width={140} height={14} />
      ) : (
        <Text variant="caption" tone={row.settled ? 'muted' : 'shared'}>
          {row.sentence}
        </Text>
      )}
      {row.note != null && (
        <Text variant="caption" tone="muted">
          {row.note}
        </Text>
      )}
    </Door>
  );
}

/** "2 por revisar": la pastilla junto al nombre. */
function PendingPill({ text }: { text: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['1'],
        paddingHorizontal: theme.space['2'],
        paddingVertical: 2,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.sharedSoft,
      }}
    >
      <ClipboardCheck size={12} color={theme.colors.shared} />
      <Text variant="caption" tone="shared">
        {text}
      </Text>
    </View>
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
