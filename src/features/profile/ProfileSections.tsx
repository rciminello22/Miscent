import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { Download, LogOut, ShieldCheck, Trash2, User } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { signOut } from '@/data/auth';
import { supabase } from '@/data/supabase';
import { updateDisplayName } from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
import { useFeedback } from '@/features/shared/useFeedback';
import { useExportData } from './useExportData';
import {
  Button,
  Card,
  Pressable,
  Row,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * Las secciones que comparten los dos perfiles de §14:
 *
 *   Estado A · "Nombre visible, ingresos, tarjetas, categorías, Privacidad y
 *              datos, cerrar sesión, eliminar cuenta"
 *   Estado B · "Nombre visible, Crear mi cuenta personal, Privacidad y datos,
 *              cerrar sesión, eliminar usuario"
 *
 * Lo que cambia entre los dos (los datos personales o la invitación a crear
 * la cuenta) vive en cada pantalla.
 */

/** K7 · el nombre visible: lo único que ve el otro miembro. */
export function DisplayNameCard() {
  const theme = useTheme();
  const { profile, refreshProfile } = useSession();

  const feedback = useFeedback();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);

  const saveName = useMutation({
    mutationFn: () => updateDisplayName(name),
    onSuccess: async () => {
      setEditingName(false);
      await refreshProfile();
      // K7 · el nombre visible es lo que ve el otro miembro.
      feedback.updated('Así te ven en tus espacios.');
    },
    onError: (error: Error) => feedback.error('No pudimos cambiar tu nombre', error),
  });

  return (
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
  );
}

/**
 * M19 · Privacidad y datos.
 *
 * §34 · "Solo se dice lo que se puede cumplir y verificar." Por eso la lista
 * es exactamente la que §34 marca como garantizable, y P9, P10 y P11 NO
 * aparecen. Decir "no vendemos tus datos" antes de tener el compromiso escrito
 * sería justo lo que la spec prohíbe.
 */
export function PrivacySection() {
  const theme = useTheme();
  const { exportData, exporting } = useExportData();

  return (
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

          <Text variant="caption" tone="muted">
            No publicamos ninguna promesa que todavía no podamos verificar.
          </Text>
        </Stack>
      </Card>

      {/* Should 4 · tus datos, en un archivo que abre Excel o Sheets. */}
      <Button
        label="Exportar mis datos (CSV)"
        variant="secondary"
        fullWidth
        loading={exporting}
        icon={<Download size={16} color={theme.colors.text} />}
        onPress={() => void exportData()}
      />
    </Stack>
  );
}

/**
 * §28 · cerrar sesión y eliminar, con confirmación en DOS pasos.
 *
 * D-02 / K4 · en los espacios queda el nombre como "ex miembro", porque esos
 * registros también son del otro miembro. Eso se dice antes, no después.
 *
 * §28 distingue las dos tablas: con cuenta personal se elimina "mi cuenta"
 * (finanzas personales + identidad); sin ella, "mi usuario" (solo identidad).
 */
const DELETE_COPY = {
  personal: {
    action: 'Eliminar mi cuenta',
    title: '¿Eliminar tu cuenta?',
    body: 'Se borran tus finanzas personales y tu usuario. En los espacios compartidos tu nombre queda en el historial como ex miembro, porque esos registros también son de la otra persona.',
    confirm: '¿Querés eliminar tu cuenta igual?',
    failure: 'No pudimos eliminarla',
  },
  guest: {
    action: 'Eliminar mi usuario',
    title: '¿Eliminar tu usuario?',
    body: 'Se borra tu usuario y salís de tus espacios. En ellos tu nombre queda en el historial como ex miembro, porque esos registros también son de la otra persona.',
    confirm: '¿Querés eliminar tu usuario igual?',
    failure: 'No pudimos eliminarlo',
  },
} as const;

export function AccountActions({ kind }: { kind: 'personal' | 'guest' }) {
  const theme = useTheme();
  const { session, isAnonymous } = useSession();
  const copy = DELETE_COPY[kind];
  const { exportData } = useExportData();

  function confirmSignOut() {
    Alert.alert('¿Cerrar sesión?', 'Vas a tener que pedir un enlace nuevo para volver.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  function confirmDelete() {
    Alert.alert(copy.title, copy.body, [
      { text: 'Cancelar', style: 'cancel' },
      // §28 · "Antes: … exportar". Después no hay de dónde sacarlos.
      { text: 'Exportar mis datos antes', onPress: () => void exportData() },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('No se puede deshacer', copy.confirm, [
            { text: 'No', style: 'cancel' },
            { text: copy.action, style: 'destructive', onPress: () => void deleteAccount() },
          ]),
      },
    ]);
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc('app_delete_account');
    if (error != null) {
      Alert.alert(copy.failure, 'Probá de nuevo en un momento.');
      return;
    }
    await signOut();
  }

  return (
    <Stack gap="3">
      {/* Sin email, cerrar sesión es perder el acceso para siempre. */}
      {isAnonymous ? (
        <Text variant="caption" tone="muted" align="center">
          Para cerrar sesión, primero guardá tu acceso con tu email: sin él no podrías
          volver a entrar.
        </Text>
      ) : (
        <Button
          label="Cerrar sesión"
          variant="secondary"
          fullWidth
          icon={<LogOut size={16} color={theme.colors.text} />}
          onPress={confirmSignOut}
        />
      )}

      <Pressable onPress={confirmDelete} haptic="none" scaleOnPress={false}>
        <Row gap="2" justify="center" align="center" style={{ paddingVertical: 12 }}>
          <Trash2 size={14} color={theme.colors.excess} />
          <Text variant="small" tone="excess">
            {copy.action}
          </Text>
        </Row>
      </Pressable>

      <Text variant="caption" tone="muted" align="center">
        {session?.user.email ?? ''}
      </Text>
    </Stack>
  );
}
