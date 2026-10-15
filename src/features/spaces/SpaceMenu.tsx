import { useState } from 'react';
import { Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { History, LogOut, Pencil, Share2, UserPlus, UserX } from 'lucide-react-native';
import { Button, Divider, Pressable, Row, Sheet, Stack, Text, TextField } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useRemoveMemberAccess, useRenameSpace } from './useSpaces';

/**
 * §24 · el menú del espacio: "Renombrar · Invitar o ver invitación · Salir
 * del espacio".
 *
 * E-03 · el nombre lo cambia cualquier miembro con acceso, sin pedir permiso
 * al otro. Es un espacio de dos: no hay administradores ni roles (§6 lo
 * excluye explícitamente).
 */
export function SpaceMenu({
  visible,
  onClose,
  spaceId,
  spaceName,
  otherMemberName,
  otherHasAccess,
  canRemoveOther,
  summaryText,
  onShowActivity,
}: {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
  otherMemberName: string;
  otherHasAccess: boolean;
  /** §26 · solo quien creó el espacio, y solo si el otro tiene acceso. */
  canRemoveOther: boolean;
  /** Should 3 · el resumen del espacio, ya escrito para leerse afuera. */
  summaryText: string;
  /** Should 6 · abre la actividad reciente (la hoja vive en la pantalla). */
  onShowActivity: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const rename = useRenameSpace(spaceId);
  const removeAccess = useRemoveMemberAccess(spaceId);

  /**
   * §26 (Should) · "Enlace reenviado por error: el creador ve quién entró y
   * puede quitar ese acceso." Confirmación en dos pasos, con lo que pasa
   * dicho antes: no es una forma de cobrarle a nadie (principio 13).
   */
  /**
   * Should 3 · la hoja de compartir sale con el menú abierto y el menú se
   * cierra después: presentar algo mientras un Modal se cierra puede
   * perderse en iOS (lo mismo que con los Alert).
   */
  function shareSummary() {
    Share.share({ message: summaryText })
      .catch(() => undefined)
      .finally(onClose);
  }

  function confirmRemove() {
    onClose();
    Alert.alert(
      `¿Quitarle el acceso a ${otherMemberName}?`,
      `Es para cuando entró alguien que no era. ${otherMemberName} deja de ver ${spaceName}; lo que cargó queda, con su nombre, y el saldo no cambia. Después podés invitar a quien corresponde.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('¿Seguro?', `${otherMemberName} va a perder el acceso a ${spaceName}.`, [
              { text: 'No', style: 'cancel' },
              {
                text: 'Quitar el acceso',
                style: 'destructive',
                onPress: () =>
                  void removeAccess.mutateAsync().catch(() =>
                    Alert.alert('No pudimos quitar el acceso', 'Probá de nuevo en un momento.'),
                  ),
              },
            ]),
        },
      ],
    );
  }

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(spaceName);

  async function save() {
    if (name.trim() === '' || name.trim() === spaceName) {
      setEditing(false);
      return;
    }
    await rename.mutateAsync(name);
    setEditing(false);
    onClose();
  }

  function go(path: string) {
    onClose();
    router.push(path);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={spaceName}>
      {editing ? (
        <Stack gap="4">
          <Text variant="smallMedium" tone="secondary">
            ¿Cómo se llama el espacio?
          </Text>

          <TextField
            variant="shared"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={60}
            accessibilityLabel="Nombre del espacio"
          />

          <Row gap="2">
            <Button
              label="Guardar"
              variant="shared"
              loading={rename.isPending}
              onPress={() => void save()}
            />
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setName(spaceName);
                setEditing(false);
              }}
            />
          </Row>
        </Stack>
      ) : (
        <Stack gap="0">
          <MenuRow
            icon={<Pencil size={17} color={theme.colors.textSecondary} />}
            label="Renombrar"
            onPress={() => setEditing(true)}
          />
          <Divider />

          <MenuRow
            icon={<History size={17} color={theme.colors.textSecondary} />}
            label="Actividad reciente"
            onPress={onShowActivity}
          />
          <Divider />

          <MenuRow
            icon={<Share2 size={17} color={theme.colors.textSecondary} />}
            label="Compartir resumen"
            onPress={shareSummary}
          />
          <Divider />

          {/* §26 · invitar solo existe si el lugar está libre: sin acceso o de
              un ex miembro (I-01 + P7). */}
          {!otherHasAccess && (
            <>
              <MenuRow
                icon={<UserPlus size={17} color={theme.colors.textSecondary} />}
                label={`Invitar a ${otherMemberName}`}
                onPress={() => go(`/space/${spaceId}/invitar`)}
              />
              <Divider />
            </>
          )}

          {canRemoveOther && (
            <>
              <MenuRow
                icon={<UserX size={17} color={theme.colors.danger} />}
                label={`Quitarle el acceso a ${otherMemberName}`}
                tone="danger"
                onPress={confirmRemove}
              />
              <Divider />
            </>
          )}

          {/* UX-13 · lo destructivo va en danger, no en el ámbar de N-08. */}
          <MenuRow
            icon={<LogOut size={17} color={theme.colors.danger} />}
            label="Salir del espacio"
            tone="danger"
            onPress={() => go(`/space/${spaceId}/salir`)}
          />
        </Stack>
      )}
    </Sheet>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ paddingVertical: theme.space['4'] }}
    >
      <Row gap="3" align="center">
        {icon}
        <Text variant="body" tone={tone}>
          {label}
        </Text>
      </Row>
    </Pressable>
  );
}
