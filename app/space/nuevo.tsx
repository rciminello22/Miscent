import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
import { AmountInput } from '@/features/add/AmountInput';
import { Segmented } from '@/features/add/fields';
import { StepShell } from '@/features/onboarding/StepShell';
import { useCreateSpace } from '@/features/spaces/useSpaces';
import { useSession } from '@/features/auth/SessionProvider';
import { Button, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * §9 + §26 · crear un espacio (Caso 2), paso a paso (10/10).
 *
 * Una pregunta por pantalla (principio 9), en el orden del Caso 2: "Nuevo
 * espacio → Martina → Están a mano → renombra". Es un flujo poco frecuente y
 * con consecuencias: el formato del onboarding le queda mejor que un
 * formulario que va apareciendo a medida que se escribe.
 *
 * E-02 · el segundo miembro arranca **sin acceso**: el creador carga por los
 * dos desde el primer día (Modo 1). El espacio sirve aunque la otra persona
 * nunca instale la app (§1, §39).
 *
 * E-07 · el saldo inicial responde "¿alguien viene poniendo más hasta hoy?":
 * la pareja que ya venía con la pizarra no arranca de cero.
 *
 * A-06 / P5 · crear un espacio requiere cuenta personal, y lo valida la RPC.
 */
type Step = 'who' | 'balance' | 'name';
type Favors = 'even' | 'me' | 'other';

export default function NuevoEspacio() {
  const router = useRouter();
  const openSpace = useOpenSpace();
  const { profile, accountState } = useSession();
  const createSpace = useCreateSpace();

  const [step, setStep] = useState<Step>('who');
  const [otherName, setOtherName] = useState('');
  const [name, setName] = useState('');
  const [favors, setFavors] = useState<Favors>('even');
  const [initialAmount, setInitialAmount] = useState(0);

  const trimmedOther = otherName.trim();
  // §9 · "Con [nombre]" por defecto; cualquiera lo puede cambiar.
  const defaultName = `Con ${trimmedOther}`;
  const finalName = name.trim() === '' ? defaultName : name.trim();

  async function save() {
    if (trimmedOther === '' || createSpace.isPending) return;

    try {
      const spaceId = await createSpace.mutateAsync({
        name: finalName,
        otherMemberName: trimmedOther,
        initialBalance: favors === 'even' ? 0 : initialAmount,
        initialBalanceFavors: favors === 'other' ? 'other' : 'me',
      });
      openSpace(spaceId, 'replace', true);
    } catch (error) {
      Alert.alert(
        'No pudimos crearlo',
        error instanceof Error ? error.message : 'Probá de nuevo en un momento.',
      );
    }
  }

  // Caso 19 / P5 · sin cuenta personal no se crea un espacio. Se explica ANTES
  // de que complete nada, y siempre con salida.
  if (accountState !== 'personal') {
    return (
      <Screen
        footer={
          <Stack gap="2">
            <Button
              label="Crear mi cuenta personal"
              size="lg"
              fullWidth
              onPress={() => router.replace('/onboarding/cuenta-personal')}
            />
            <Button
              label="Ahora no"
              variant="ghost"
              fullWidth
              haptic="none"
              onPress={() => goBack(router)}
            />
          </Stack>
        }
      >
        <Stack gap="4">
          <Text variant="title">Para crear un espacio necesitás tu cuenta personal</Text>
          <Text variant="body" tone="secondary">
            Es privada y la podés completar cuando quieras. Tus espacios de ahora no
            cambian.
          </Text>
        </Stack>
      </Screen>
    );
  }

  if (step === 'who') {
    return (
      <StepShell
        step={1}
        total={3}
        title="¿Con quién lo compartís?"
        description="Un espacio es para dos personas: anotan lo que pagan y la app hace las cuentas."
        help="Solo su nombre. Podés invitarla después, o nunca: el espacio funciona igual y vos cargás por los dos. ¿Ya usa la app? Pedile que te invite, así no crean dos espacios."
        continueDisabled={trimmedOther === ''}
        onContinue={() => setStep('balance')}
        onSkip={() => goBack(router)}
        skipLabel="Ahora no"
      >
        <TextField value={otherName} onChange={setOtherName} placeholder="Martina" autoFocus />
      </StepShell>
    );
  }

  if (step === 'balance') {
    return (
      <StepShell
        step={2}
        total={3}
        title="¿Alguien viene poniendo más hasta hoy?"
        description="Si ya venían anotando en otro lado, arrancá desde ahí."
        help={`${trimmedOther} también lo va a ver si entra al espacio, y lo puede corregir.`}
        continueDisabled={favors !== 'even' && initialAmount <= 0}
        onContinue={() => setStep('name')}
        onSkip={() => setStep('who')}
        skipLabel="Atrás"
      >
        <Stack gap="5">
          {/* S-06 · "Están a mano" es la respuesta por defecto. */}
          <Segmented
            options={[
              { value: 'even', label: 'Están a mano' },
              { value: 'me', label: `${profile?.displayName ?? 'Yo'} puso más` },
              { value: 'other', label: `${trimmedOther} puso más` },
            ]}
            value={favors}
            onChange={setFavors}
          />
          {favors !== 'even' && (
            <AmountInput value={initialAmount} onChange={setInitialAmount} autoFocus={false} />
          )}
        </Stack>
      </StepShell>
    );
  }

  return (
    <StepShell
      step={3}
      total={3}
      title="¿Cómo se llama el espacio?"
      description="Lo pueden cambiar los dos cuando quieran."
      continueLabel="Crear espacio"
      saving={createSpace.isPending}
      onContinue={() => void save()}
      onSkip={() => setStep('balance')}
      skipLabel="Atrás"
    >
      <TextField value={name} onChange={setName} placeholder={defaultName} autoFocus />
    </StepShell>
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
