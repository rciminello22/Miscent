import { Button, Pressable, Sheet, Stack, Text } from '@/ui/primitives';

/**
 * CA-07 · Caso 18 · una invitada (Estado B) toca "Personal" en Agregar.
 *
 * Nunca un candado ni un "no podés" (§33): se explica dónde viven sus gastos
 * personales y se ofrecen las dos salidas útiles. Si crea la cuenta, lo que
 * ya escribió no se pierde: se guarda como personal al terminar (P5).
 */
export function GuestPersonalSheet({
  visible,
  ...props
}: { visible: boolean } & Parameters<typeof GuestPersonalContent>[0]) {
  return (
    <Sheet visible={visible} onClose={props.onCancel} title="Gasto personal">
      <GuestPersonalContent {...props} />
    </Sheet>
  );
}

export function GuestPersonalContent({
  spaceName,
  onCreateAccount,
  onLoadInSpace,
  onCancel,
}: {
  spaceName: string;
  onCreateAccount: () => void;
  onLoadInSpace: () => void;
  onCancel: () => void;
}) {
  return (
    <Stack gap="5">
      <Stack gap="2">
        <Text variant="body">
          Tus gastos personales viven en tu cuenta personal, que es privada. Todavía no la
          creaste.
        </Text>
        <Text variant="small" tone="secondary">
          Si la creás ahora, lo que cargaste se guarda en tu cuenta personal cuando termines.
        </Text>
      </Stack>

      <Stack gap="3">
        <Button label="Crear mi cuenta personal" size="lg" fullWidth onPress={onCreateAccount} />
        <Button label={`Cargarlo en ${spaceName}`} variant="secondary" fullWidth onPress={onLoadInSpace} />
        <Pressable onPress={onCancel} haptic="none" accessibilityRole="button">
          <Text variant="small" tone="muted" align="center">
            Cancelar
          </Text>
        </Pressable>
      </Stack>
    </Stack>
  );
}
