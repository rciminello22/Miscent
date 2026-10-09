import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  CreditCard,
  LogOut,
  Repeat,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { signOut } from '@/data/auth';
import { supabase } from '@/data/supabase';
import { updateDisplayName } from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import {
  Button,
  Card,
  Divider,
  Pressable,
  Row,
  Screen,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §14 · Perfil: nombre visible, ingresos, tarjetas, categorías, Privacidad y
 * datos, cerrar sesión, eliminar cuenta.
 *
 * M19 · "Privacidad visible" es Must, y §34 pone la regla: **solo se dice lo
 * que se puede cumplir y verificar**. Por eso la lista de promesas de acá son
 * exactamente las que §34 marca como garantizables, y las pendientes (P9, P10,
 * P11) NO aparecen. Decir "no vendemos tus datos" antes de tener el
 * compromiso escrito sería justo lo que la spec prohíbe.
 */
export default function Perfil() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, session, refreshProfile } = useSession();
  const { facts } = usePersonalFacts();

  const [name, setName] = useState(profile?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);

  const cards = facts.paymentMethods.filter((method) => method.kind === 'card');
  const fixed = facts.recurrences.filter(
    (recurrence) => recurrence.kind === 'expense' && recurrence.spaceId == null,
  );
  const incomes = facts.recurrences.filter((recurrence) => recurrence.kind === 'income');

  const saveName = useMutation({
    mutationFn: () => updateDisplayName(name),
    onSuccess: async () => {
      setEditingName(false);
      await refreshProfile();
    },
  });

  function confirmSignOut() {
    Alert.alert('¿Cerrar sesión?', 'Vas a tener que pedir un enlace nuevo para volver.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  /**
   * §28 · eliminación de cuenta, con confirmación en DOS pasos.
   *
   * D-02 / K4 · en los espacios queda el nombre como "ex miembro", porque
   * esos registros también son del otro miembro. Eso se dice antes, no
   * después.
   */
  function confirmDelete() {
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Se borran tus finanzas personales y tu usuario. En los espacios compartidos tu nombre queda en el historial como ex miembro, porque esos registros también son de la otra persona.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('No se puede deshacer', '¿Querés eliminar tu cuenta igual?', [
              { text: 'No', style: 'cancel' },
              {
                text: 'Eliminar mi cuenta',
                style: 'destructive',
                onPress: () => void deleteAccount(),
              },
            ]),
        },
      ],
    );
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc('app_delete_account');
    if (error != null) {
      Alert.alert('No pudimos eliminarla', 'Probá de nuevo en un momento.');
      return;
    }
    await signOut();
  }

  return (
    <Screen>
      <Stack gap="7">
        <Text variant="overline" tone="muted">
          Perfil
        </Text>

        {/* ── Nombre visible (K7) ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Card>
            <Stack gap="4">
              <Row gap="3" align="center">
                <User size={18} color={theme.colors.brand} />
                <Text variant="smallMedium" tone="secondary" style={{ flex: 1 }}>
                  Tu nombre visible
                </Text>
              </Row>

              {editingName ? (
                <Stack gap="3">
                  <View
                    style={{
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.brand,
                      paddingHorizontal: theme.space['4'],
                      height: 48,
                      justifyContent: 'center',
                    }}
                  >
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      autoFocus
                      maxLength={60}
                      accessibilityLabel="Tu nombre visible"
                      style={[theme.typography.body, { color: theme.colors.text }]}
                    />
                  </View>
                  <Row gap="2">
                    <Button
                      label="Guardar"
                      loading={saveName.isPending}
                      disabled={name.trim().length === 0}
                      onPress={() => void saveName.mutateAsync()}
                    />
                    <Button
                      label="Cancelar"
                      variant="ghost"
                      onPress={() => {
                        setName(profile?.displayName ?? '');
                        setEditingName(false);
                      }}
                    />
                  </Row>
                </Stack>
              ) : (
                <Pressable onPress={() => setEditingName(true)} haptic="none" scaleOnPress={false}>
                  <Row justify="space-between" align="center">
                    <Text variant="heading">{profile?.displayName ?? '—'}</Text>
                    <Text variant="small" tone="brand">
                      Cambiar
                    </Text>
                  </Row>
                </Pressable>
              )}

              {/* K7 · es lo único que ve el otro miembro. Nunca el email. */}
              <Text variant="caption" tone="muted">
                Es lo único que ve la otra persona en un espacio compartido. Tu email no se
                muestra nunca.
              </Text>
            </Stack>
          </Card>
        </Animated.View>

        {/* ── Lo que cargaste ─────────────────────────────────────────── */}
        <Stack gap="4">
          <SectionHeader title="Tus datos" />
          <Card>
            <Stack gap="0">
              <SummaryRow
                icon={<Repeat size={16} color={theme.colors.textSecondary} />}
                label="Ingresos"
                value={`${incomes.length}`}
                onPress={() => router.push('/onboarding/ingreso')}
              />
              <Divider />
              <SummaryRow
                icon={<CreditCard size={16} color={theme.colors.textSecondary} />}
                label="Tarjetas"
                value={`${cards.length}`}
                onPress={() => router.push('/onboarding/tarjetas')}
              />
              <Divider />
              <SummaryRow
                icon={<Repeat size={16} color={theme.colors.textSecondary} />}
                label="Fijos"
                value={`${fixed.length}`}
                onPress={() => router.push('/onboarding/fijos')}
              />
            </Stack>
          </Card>
        </Stack>

        {/* ── M19 · Privacidad y datos ────────────────────────────────── */}
        <Stack gap="4">
          <SectionHeader title="Privacidad y datos" />
          <Card tone="sunken">
            <Stack gap="4">
              <Row gap="3" align="center">
                <ShieldCheck size={18} color={theme.colors.shared} />
                <Text variant="smallMedium" style={{ flex: 1 }}>
                  Lo que podemos garantizar
                </Text>
              </Row>

              <Stack gap="3">
                {[
                  'No nos conectamos a tus cuentas ni sabemos cuánta plata tenés.',
                  'No te pedimos claves del banco ni números de tarjeta.',
                  'Tus finanzas personales las ves solo vos.',
                  'En un espacio compartido, la otra persona ve solo lo que se carga ahí.',
                  'Nadie recibe nada tuyo sin que vos lo compartas.',
                  'Podés borrar tu cuenta y tus datos.',
                ].map((promise) => (
                  <Row key={promise} gap="3" align="flex-start">
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: theme.colors.shared,
                        marginTop: 7,
                      }}
                    />
                    <Text variant="small" tone="secondary" style={{ flex: 1 }}>
                      {promise}
                    </Text>
                  </Row>
                ))}
              </Stack>

              {/*
                §34 · "Solo se dice lo que se puede cumplir y verificar."
                P9, P10 y P11 (plazo de borrado en copias, compromiso escrito
                sobre venta de datos, y cifrado/ubicación/uso para entrenar IA
                de los proveedores) todavía están pendientes, así que acá NO
                figuran como promesas.
              */}
              <Text variant="caption" tone="muted">
                No publicamos ninguna promesa que todavía no podamos verificar.
              </Text>
            </Stack>
          </Card>
        </Stack>

        {/* ── Sesión y cuenta ─────────────────────────────────────────── */}
        <Stack gap="3">
          <Button
            label="Cerrar sesión"
            variant="secondary"
            fullWidth
            icon={<LogOut size={16} color={theme.colors.text} />}
            onPress={confirmSignOut}
          />

          <Pressable onPress={confirmDelete} haptic="none" scaleOnPress={false}>
            <Row gap="2" justify="center" align="center" style={{ paddingVertical: 12 }}>
              <Trash2 size={14} color={theme.colors.excess} />
              <Text variant="small" tone="excess">
                Eliminar mi cuenta
              </Text>
            </Row>
          </Pressable>
        </Stack>

        <Text variant="caption" tone="muted" align="center">
          {session?.user.email ?? ''}
        </Text>
      </Stack>
    </Screen>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ paddingVertical: theme.space['4'] }}
    >
      <Row gap="3" align="center">
        {icon}
        <Text variant="body" style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="bodyMedium" tone="secondary" tabular>
          {value}
        </Text>
        <ChevronRight size={16} color={theme.colors.textMuted} />
      </Row>
    </Pressable>
  );
}
