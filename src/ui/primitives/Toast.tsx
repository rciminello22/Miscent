import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Keyboard, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { duration } from '../motion';
import { colorSchemes } from '../colors';
import { useTheme } from '../theme';
import { MIN_TARGET, hitSlopFor } from '../touch';
import { Pressable } from './Pressable';
import { Text } from './Text';

/**
 * El aviso después de guardar o eliminar. §17 · §12.
 *
 * Vive en la raíz de la app, no en la pantalla que guardó: Agregar se cierra
 * al guardar, y el aviso —con su "Deshacer"— tiene que sobrevivirla. Por eso
 * la acción también tiene que ser independiente de esa pantalla (ver
 * `undoCreation`).
 *
 * Uno a la vez: el nuevo reemplaza al anterior, nunca se apilan.
 */

export type ToastAction = { label: string; onPress: () => void };

export type ToastInput = {
  title: string;
  detail?: string | null;
  tone?: 'default' | 'error';
  /** Una acción (atajo de `actions`). */
  action?: ToastAction;
  /** Varias, de izquierda a derecha: "Ver en Futuro" y "Deshacer". */
  actions?: readonly ToastAction[];
};

type ToastContextValue = { show: (input: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/** Las acciones del aviso, sea que vengan sueltas o en lista. */
function actionsOf(input: ToastInput): readonly ToastAction[] {
  if (input.actions != null) return input.actions;
  return input.action != null ? [input.action] : [];
}

/** Con una acción hay que dar tiempo a leer y decidir. */
function durationOf(input: ToastInput): number {
  return actionsOf(input).length > 0 || input.tone === 'error' ? 6_000 : 4_000;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(ToastInput & { id: number }) | null>(null);
  const nextId = useRef(0);

  const show = useCallback((input: ToastInput) => {
    // UX-09 · el aviso se ancla abajo y un error llega, casi siempre, con el
    // teclado numérico de un formulario abierto: lo taparía. Cerrarlo es más
    // simple y más robusto que medir su altura (varía por dispositivo y por
    // teclado), y de paso deja ver el formulario completo. El aviso normal no:
    // llega al navegar, cuando el teclado ya no está.
    if (input.tone === 'error') Keyboard.dismiss();

    nextId.current += 1;
    setCurrent({ ...input, id: nextId.current });
  }, []);

  useEffect(() => {
    if (current == null) return;
    const timer = setTimeout(() => setCurrent(null), durationOf(current));
    return () => clearTimeout(timer);
  }, [current]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current != null && (
        <ToastView key={current.id} toast={current} onDismiss={() => setCurrent(null)} />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context == null) throw new Error('useToast necesita un ToastProvider en la raíz.');
  return context;
}

function ToastView({ toast, onDismiss }: { toast: ToastInput; onDismiss: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isError = toast.tone === 'error';
  // Superficie invertida: contrasta con cualquier pantalla, en claro y oscuro.
  const background = theme.colors.text;
  const foreground = theme.colors.background;
  // UX-13 · el aviso de error marca su borde con `danger`. La superficie está invertida,
  // así que va el `danger` del OTRO tema: el que se lee sobre ese fondo (≥4,5:1).
  const errorMarker = colorSchemes[theme.scheme === 'dark' ? 'light' : 'dark'].danger;

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.base)}
      exiting={FadeOutDown.duration(duration.base)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: theme.space['4'],
        right: theme.space['4'],
        // Por encima de la barra de pestañas.
        bottom: insets.bottom + 72,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space['3'],
          backgroundColor: background,
          borderRadius: theme.radius.lg,
          borderLeftWidth: isError ? 4 : 0,
          borderLeftColor: errorMarker,
          paddingVertical: theme.space['3'],
          paddingHorizontal: theme.space['4'],
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        {/* El rol va en el texto y no en el contenedor: un contenedor
            `accessible` esconde el botón de la acción a VoiceOver. */}
        <View
          accessible
          accessibilityRole={isError ? 'alert' : 'summary'}
          accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
          style={{ flex: 1, gap: 2 }}
        >
          <Text variant="smallMedium" style={{ color: foreground }}>
            {toast.title}
          </Text>
          {toast.detail != null && toast.detail !== '' && (
            <Text variant="caption" style={{ color: foreground, opacity: 0.8 }}>
              {toast.detail}
            </Text>
          )}
        </View>

        {actionsOf(toast).map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            // UX-12 · 8 + 20 + 8 = 36 de alto: el toque llega a 44.
            hitSlop={hitSlopFor(MIN_TARGET, 36)}
            haptic="light"
            onPress={() => {
              action.onPress();
              onDismiss();
            }}
            style={{ paddingVertical: theme.space['2'], paddingHorizontal: theme.space['2'] }}
          >
            <Text variant="smallMedium" style={{ color: theme.colors.brandSoft }}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}
