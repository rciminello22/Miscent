import { Info } from 'lucide-react-native';
import { useRememberedFlag } from '@/features/shared/useRememberedFlag';
import { Button, Card, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { DOT_HELP_TEXT, shouldShowDotHelp } from './movementsTab';

/** La marca que sobrevive cerrar la app: "ya entendí qué es el punto". */
export const DOT_HELP_FLAG = 'radar.movements.dotHelp';

/**
 * La ayuda del punto, la primera vez: una tarjeta chica junto a la franja que
 * dice qué significa el punto bajo un día. "Entendido" la cierra y no vuelve
 * (`useRememberedFlag`); después queda solo la leyenda discreta de la franja.
 *
 * Es una tarjeta en el flujo y no un globo flotante: se lee con el lector de
 * pantalla en su lugar, no tapa la franja ni depende de dónde caiga el punto, y
 * con el botón de cierre explícito nadie la pierde por un toque de más.
 *
 * Solo aparece si hay un punto a la vista (`recordDays`): sin puntos no hay
 * nada que explicar y no se gasta la única vez.
 */
export function DotHelp({ recordDays }: { recordDays: number }) {
  const theme = useTheme();
  const [understood, markUnderstood] = useRememberedFlag(DOT_HELP_FLAG);

  if (!shouldShowDotHelp({ remembered: understood, recordDays })) return null;

  return (
    <Card tone="sunken" style={{ padding: theme.space['4'] }}>
      <Stack gap="3">
        <Row gap="2" align="flex-start">
          <Info size={16} color={theme.colors.textMuted} style={{ marginTop: 2 }} />
          <Text variant="small" tone="secondary" style={{ flex: 1 }} accessibilityRole="text">
            {DOT_HELP_TEXT}
          </Text>
        </Row>
        <Button label="Entendido" variant="secondary" onPress={markUnderstood} />
      </Stack>
    </Card>
  );
}
