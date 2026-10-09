import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Pencil, UserPlus } from 'lucide-react-native';
import { Button, Divider, Pressable, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useRenameSpace } from './useSpaces';

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
}: {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
  otherMemberName: string;
  otherHasAccess: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const rename = useRenameSpace(spaceId);

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

          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.shared,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.space['4'],
              height: 50,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={60}
              accessibilityLabel="Nombre del espacio"
              style={[theme.typography.body, { color: theme.colors.text }]}
            />
          </View>

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

          {/* §26 · invitar solo existe si hay un lugar sin acceso (I-01). */}
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

          <MenuRow
            icon={<LogOut size={17} color={theme.colors.excess} />}
            label="Salir del espacio"
            tone="excess"
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
  tone?: 'default' | 'excess';
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
        <Text variant="body" tone={tone === 'excess' ? 'excess' : 'default'}>
          {label}
        </Text>
      </Row>
    </Pressable>
  );
}
