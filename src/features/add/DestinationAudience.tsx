import { User, Users } from 'lucide-react-native';
import { Row, Text, type Audience } from '@/ui/primitives';
import { audienceSentence } from '@/ui/primitives/audienceCopy';
import { useTheme } from '@/ui/theme';

/**
 * §12 y §17 campo 4 · la audiencia pegada a la elección del destino: "Solo vos
 * lo ves" con una persona, "Lo ven vos y Martina" con dos y el color de lo
 * compartido. Se lee al ELEGIR, antes de saber qué se va a cargar.
 *
 * Se suma a la del pie (`SaveFooter`), que sigue junto a Guardar: esa se ve
 * siempre, incluso con el teclado abierto; esta acompaña la decisión.
 *
 * Presentacional: quien lo usa decide la audiencia (según el destino elegido).
 */
export function DestinationAudience({ audience }: { audience: Audience }) {
  const theme = useTheme();
  const isPrivate = audience.kind === 'private';
  const Icon = isPrivate ? User : Users;

  return (
    <Row gap="2" align="center">
      <Icon
        testID={`destination-audience-icon-${audience.kind}`}
        size={14}
        color={isPrivate ? theme.colors.textMuted : theme.colors.shared}
      />
      {/* Polite: al cambiar el destino el lector de pantalla anuncia quién lo ve. */}
      <Text
        variant="caption"
        tone={isPrivate ? 'secondary' : 'shared'}
        accessibilityLiveRegion="polite"
      >
        {audienceSentence(audience)}
      </Text>
    </Row>
  );
}
