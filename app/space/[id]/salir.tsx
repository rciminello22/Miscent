import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatInstallment, formatMonth } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { queryKeys } from '@/data/queryClient';
import { supabase } from '@/data/supabase';
import { useSession } from '@/features/auth/SessionProvider';
import { balanceSentence } from '@/features/spaces/balanceCopy';
import { buildLeaveSummary } from '@/features/spaces/leaveSummary';
import { useSpace } from '@/features/spaces/useSpaces';
import {
  Button,
  Card,
  Divider,
  Money,
  Pressable,
  Row,
  Screen,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §27 · salir de un espacio.
 *
 * "Principio [K4, K5]: salir no borra la historia ni los compromisos ya
 *  generados; solo corta lo que todavía no empezó."
 *
 * La pantalla existe para que nadie salga sin saber tres cosas, porque salir
 * NO se puede deshacer:
 *
 *   1. cuánto se deben hoy
 *   2. qué cuotas compartidas SIGUEN después de salir (SA-03): la heladera ya
 *      se compró, y las cuotas que faltan van a seguir sumando al saldo
 *   3. qué fijos se DETIENEN (SA-04): el alquiler era un acuerdo a futuro
 *
 * Esa asimetría es K5, y es la decisión más fina de la sección: salir corta lo
 * que todavía no empezó, no lo que ya está contraído.
 *
 * §27 paso 2 ofrece "Registrar un pago" antes de salir, porque el momento
 * natural de saldar es justo este.
 */
export default function Salir() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const spaceId = id ?? '';

  const { session } = useSession();
  const { derived, today } = useSpace(spaceId);
  const [confirming, setConfirming] = useState(false);

  const summary = useMemo(() => {
    if (derived == null) return null;
    return buildLeaveSummary({
      facts: derived.facts,
      mySlot: derived.mySlot,
      balance: derived.balance,
      today,
    });
  }, [derived, today]);

  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('app_leave_space', { target_space_id: spaceId });
      if (error != null) throw new Error('No pudimos sacarte del espacio.');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.spaces }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
        }),
      ]);
      router.replace('/');
    },
    onError: (error: Error) => {
      setConfirming(false);
      Alert.alert('No pudimos hacerlo', error.message);
    },
  });

  if (derived == null || summary == null) {
    return (
      <Screen>
        <Text variant="body" tone="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const { facts } = derived;
  const hasDebt = !summary.balance.settled;

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Salir de {facts.space.name}</Text>
          <Pressable
            onPress={() => goBack(router)}
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

        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Text variant="body" tone="secondary">
            Antes de salir, mirá cómo quedan las cosas.
          </Text>
        </Animated.View>

        {/* 1 · el saldo */}
        {hasDebt && (
          <Animated.View entering={FadeInDown.delay(stagger(1, 70)).duration(duration.base)}>
            <Stack gap="3">
              <SectionHeader title="Lo que se deben" />
              <Card tone="shared">
                <Stack gap="3">
                  <Text variant="bodyMedium">{balanceSentence(summary.balance)}</Text>
                  <Button
                    label="Registrar un pago antes de salir"
                    variant="secondary"
                    onPress={() => router.push(`/space/${spaceId}/pago`)}
                  />
                </Stack>
              </Card>
            </Stack>
          </Animated.View>
        )}

        {/* 2 · SA-03 · las cuotas que SIGUEN */}
        {summary.continuingInstallments.length > 0 && (
          <Animated.View entering={FadeInDown.delay(stagger(2, 70)).duration(duration.base)}>
            <Stack gap="3">
              <SectionHeader title="Cuotas que siguen" />
              <Card>
                <Stack gap="0">
                  {summary.continuingInstallments.map((item, index) => (
                    <View key={item.label + index}>
                      <Row
                        justify="space-between"
                        align="flex-start"
                        style={{ paddingVertical: theme.space['3'] }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="smallMedium">{prettyLabel(item.label)}</Text>
                          <Text variant="caption" tone="muted">
                            quedan {item.remainingCount}{' '}
                            {item.remainingCount === 1 ? 'cuota' : 'cuotas'} · hasta{' '}
                            {formatMonth(item.endsOn, item.endsOn)}
                          </Text>
                        </View>
                        <Money amount={item.myRemaining} variant="smallMedium" />
                      </Row>
                      {index < summary.continuingInstallments.length - 1 && <Divider />}
                    </View>
                  ))}
                </Stack>
              </Card>

              {/* SA-03 / K5 · la parte que más importa explicar. */}
              <Text variant="small" tone="secondary">
                Estas cuotas no se cortan: ya estaban compradas. Van a seguir con el mismo
                reparto y cada una va a seguir cambiando lo que se deben.
              </Text>
            </Stack>
          </Animated.View>
        )}

        {/* 3 · SA-04 · los fijos que se DETIENEN */}
        {summary.stoppingRecurrences.length > 0 && (
          <Animated.View entering={FadeInDown.delay(stagger(3, 70)).duration(duration.base)}>
            <Stack gap="3">
              <SectionHeader title="Fijos que dejan de ser compartidos" />
              <Card>
                <Stack gap="0">
                  {summary.stoppingRecurrences.map((item, index) => (
                    <View key={item.id}>
                      <Row
                        justify="space-between"
                        align="flex-start"
                        style={{ paddingVertical: theme.space['3'] }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="smallMedium">{prettyLabel(item.label)}</Text>
                          <Text variant="caption" tone="muted">
                            {item.payerIsMe ? 'lo pagás vos' : `lo paga ${summary.otherMemberName}`}{' '}
                            · tu parte por mes
                          </Text>
                        </View>
                        <Money amount={item.myShare} variant="smallMedium" />
                      </Row>
                      {index < summary.stoppingRecurrences.length - 1 && <Divider />}
                    </View>
                  ))}
                </Stack>
              </Card>

              <Text variant="small" tone="secondary">
                Dejan de ser compartidos desde hoy. {summary.otherMemberName} va a decidir si
                los sigue pagando.
              </Text>
            </Stack>
          </Animated.View>
        )}

        {/* K4 · el nombre queda en el historial. Se dice antes, no después. */}
        <Animated.View entering={FadeInDown.delay(stagger(4, 70)).duration(duration.base)}>
          <Card tone="sunken">
            <Text variant="small" tone="secondary">
              Tu nombre queda en el historial de {facts.space.name} como ex miembro, porque
              esos registros también son de {summary.otherMemberName}.
            </Text>
          </Card>
        </Animated.View>

        {/* §27 paso 3 · la confirmación final, en dos pasos. */}
        <Stack gap="3">
          {!confirming ? (
            <Button
              label="Salir igual"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => setConfirming(true)}
            />
          ) : (
            <Animated.View entering={FadeInDown.duration(duration.base)}>
              <Stack gap="3">
                <Card tone="sunken">
                  <Text variant="smallMedium">
                    Vas a dejar de ver {facts.space.name}. No se puede deshacer.
                  </Text>
                </Card>
                <Button
                  label="Salir del espacio"
                  size="lg"
                  fullWidth
                  loading={leave.isPending}
                  onPress={() => void leave.mutateAsync()}
                />
                <Pressable onPress={() => setConfirming(false)} haptic="none">
                  <Text variant="small" tone="muted" align="center">
                    Cancelar
                  </Text>
                </Pressable>
              </Stack>
            </Animated.View>
          )}

          {!confirming && (
            <Pressable onPress={() => goBack(router)} haptic="none">
              <Text variant="small" tone="muted" align="center">
                Mejor no
              </Text>
            </Pressable>
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
