import { Trash2 } from 'lucide-react-native';
import { Pressable, RowChevron, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * P27 · el aviso de lo que eliminó el otro miembro, debajo del N1 del espacio.
 * Una línea discreta ("Martina eliminó Super · $100.000 · ayer (y 2 más)") que
 * se toca para abrir "Actividad reciente". No es una cuarta puerta ni pide
 * decidir nada: eliminar no necesita aprobación (K3 / X-02), esto solo evita
 * enterarse por casualidad. Presentacional: el texto lo arma `deletionNoticeText`.
 */
export function DeletionNotice({ text, onPress }: { text: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={`${text}. Ver la actividad reciente`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['3'],
        paddingVertical: theme.space['3'],
        paddingHorizontal: theme.space['4'],
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surfaceSunken,
      }}
    >
      <Trash2 size={16} color={theme.colors.textSecondary} />
      <Text variant="small" tone="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
      <RowChevron />
    </Pressable>
  );
}
