import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AmountInput } from '@/features/add/AmountInput';
import { Field, Segmented } from '@/features/add/fields';
import { useCreateSpace } from '@/features/spaces/useSpaces';
import { useSession } from '@/features/auth/SessionProvider';
import {
  Button,
  Card,
  Pressable,
  Row,
  Screen,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §9 + §26 · crear un espacio (Caso 2).
 *
 * E-02 · el segundo miembro arranca **sin acceso**: el creador carga por los
 * dos desde el primer día (Modo 1). Eso es central para que el espacio sirva
 * aunque la otra persona nunca instale la app (§1), que §39 declara como el
 * riesgo principal del pilar compartido.
 *
 * E-07 · el saldo inicial es opcional, y responde a una pregunta muy concreta:
 * "¿alguien viene poniendo más hasta hoy?". Sin eso, la pareja que ya venía
 * usando la pizarra tendría que empezar de cero y perder lo acumulado.
 *
 * A-06 / P5 · crear un espacio requiere cuenta personal, y lo valida la RPC.
 */
export default function NuevoEspacio() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useSession();
  const createSpace = useCreateSpace();

  const [otherName, setOtherName] = useState('');
  const [name, setName] = useState('');
  const [hasInitialBalance, setHasInitialBalance] = useState(false);
  const [initialAmount, setInitialAmount] = useState(0);
  const [favors, setFavors] = useState<'me' | 'other'>('me');

  const trimmedOther = otherName.trim();
  // §9 · "Con [nombre]" por defecto; cualquiera lo puede cambiar.
  const defaultName = trimmedOther === '' ? '' : `Con ${trimmedOther}`;
  const finalName = name.trim() === '' ? defaultName : name.trim();

  const canSave = trimmedOther.length > 0 && !createSpace.isPending;

  async function save() {
    if (!canSave) return;

    try {
      const spaceId = await createSpace.mutateAsync({
        name: finalName,
        otherMemberName: trimmedOther,
        initialBalance: hasInitialBalance ? initialAmount : 0,
        initialBalanceFavors: favors,
      });
      router.replace(`/space/${spaceId}`);
    } catch (error) {
      Alert.alert(
        'No pudimos crearlo',
        error instanceof Error ? error.message : 'Probá de nuevo en un momento.',
      );
    }
  }

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Nuevo espacio</Text>
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

        <Text variant="body" tone="secondary">
          Un espacio es para dos personas. Anotan lo que pagan y la app hace las cuentas.
        </Text>

        <Field
          label="¿Con quién lo compartís?"
          hint="Solo su nombre. Podés invitarla después, o nunca: el espacio funciona igual y vos cargás por los dos."
        >
          <TextField
            value={otherName}
            onChange={setOtherName}
            placeholder="Martina"
            autoFocus
          />
        </Field>

        {trimmedOther !== '' && (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Field label="¿Cómo se llama el espacio?">
              <TextField value={name} onChange={setName} placeholder={defaultName} />
            </Field>
          </Animated.View>
        )}

        {/* E-07 · el saldo inicial. */}
        {trimmedOther !== '' && (
          <Animated.View entering={FadeInDown.delay(60).duration(duration.base)}>
            <Card tone="sunken">
              <Stack gap="4">
                <Pressable
                  onPress={() => setHasInitialBalance(!hasInitialBalance)}
                  haptic="none"
                  scaleOnPress={false}
                >
                  <Row justify="space-between" align="center">
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="smallMedium">
                        ¿Alguien viene poniendo más hasta hoy?
                      </Text>
                      <Text variant="caption" tone="muted">
                        Si ya venían anotando en otro lado, arrancá desde ahí.
                      </Text>
                    </View>
                    <Text variant="small" tone="brand">
                      {hasInitialBalance ? 'Quitar' : 'Agregar'}
                    </Text>
                  </Row>
                </Pressable>

                {hasInitialBalance && (
                  <Animated.View entering={FadeInDown.duration(duration.base)}>
                    <Stack gap="4">
                      <AmountInput
                        value={initialAmount}
                        onChange={setInitialAmount}
                        autoFocus={false}
                      />

                      <Segmented
                        options={[
                          { value: 'me', label: `${profile?.displayName ?? 'Yo'} puso más` },
                          { value: 'other', label: `${trimmedOther} puso más` },
                        ]}
                        value={favors}
                        onChange={setFavors}
                      />
                    </Stack>
                  </Animated.View>
                )}
              </Stack>
            </Card>
          </Animated.View>
        )}

        <Button
          label="Crear espacio"
          variant="shared"
          size="lg"
          fullWidth
          haptic="success"
          disabled={!canSave}
          loading={createSpace.isPending}
          onPress={() => void save()}
        />

        {/* §13 O1 paso 5b · la pregunta previa que evita espacios duplicados. */}
        <Text variant="caption" tone="muted" align="center">
          ¿La otra persona ya usa la app? Pedile que te invite, así no crean dos espacios.
        </Text>
      </Stack>
    </Screen>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: focused ? theme.colors.shared : theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.space['4'],
        height: 50,
        justifyContent: 'center',
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoFocus={autoFocus}
        maxLength={60}
        accessibilityLabel={placeholder}
        style={[theme.typography.body, { color: theme.colors.text }]}
      />
    </View>
  );
}
