import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { AudienceBadge, Pressable, Row, Screen, Stack, Text } from '@/ui/primitives';
import { useSession } from '@/features/auth/SessionProvider';
import { useTheme } from '@/ui/theme';

/**
 * §17 · el formulario único Agregar.
 *
 * Existe en los dos estados, con una diferencia que viene de K2 y P5:
 *   Estado A · destino "Solo yo" POR DEFECTO, más un chip por espacio
 *   Estado B · solo los espacios; al tocar "Personal" se abre la hoja del
 *              Caso 18, que ofrece crear la cuenta personal
 *
 * CA-10 · "Agregar abre con 'Solo yo' y 'Solo vos lo ves'". Eso no es una
 * preferencia de diseño: es la defensa principal contra cargar un gasto
 * personal en un espacio por error, que §32 marca como "rompe privacidad".
 *
 * ⚠️ Fase 3 · acá está la ruta y el indicador de audiencia por defecto. Los
 * doce campos, la vista previa de cuotas y el guardado llegan en la Fase 4.
 */
export default function Agregar() {
  const theme = useTheme();
  const router = useRouter();
  const { accountState } = useSession();

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Agregar</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceSunken,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </Row>

        {/* CA-10 · el destino por defecto es "Solo yo", y la audiencia se ve. */}
        <Stack gap="2">
          <Text variant="small" tone="secondary">
            Destino
          </Text>
          <Row gap="2">
            <AudienceBadge audience={{ kind: 'private' }} />
          </Row>
          <Text variant="caption" tone="muted">
            {accountState === 'guest'
              ? 'Tus gastos personales viven en tu cuenta personal, que es privada.'
              : 'Solo vos lo ves. Para compartirlo, elegí un espacio.'}
          </Text>
        </Stack>

        <Text variant="caption" tone="muted">
          Fase 3 · monto, categoría, quién pagó, reparto, medio de pago, cuotas y la
          vista previa llegan en la Fase 4.
        </Text>
      </Stack>
    </Screen>
  );
}
