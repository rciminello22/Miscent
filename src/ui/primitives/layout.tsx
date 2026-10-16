import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomPadding } from '../layout';
import { useTheme } from '../theme';
import { useKeyboardVisible } from '../useKeyboardVisible';
import { Text } from './Text';

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * La pantalla base de los formularios y las hojas.
 *
 * El teclado nunca tapa lo que se escribe (10/10, probando en el iPhone):
 *   · KeyboardAvoidingView achica la pantalla en iOS cuando abre el teclado
 *   · automaticallyAdjustKeyboardInsets lleva el campo activo a la vista
 * Con lo que trae React Native: react-native-keyboard-controller no viene en
 * Expo Go.
 *
 * `footer` · el botón principal de un formulario, FIJO abajo: queda a la
 * vista sin scrollear y sube con el teclado. Solo para formularios; las
 * pantallas de contenido no lo usan (decisión del 10/10).
 */
export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
  footer,
  inTabs = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  /**
   * La pantalla vive dentro de la barra de pestañas (con el botón Agregar a la
   * vista): la barra ya lleva el inset de abajo, no se suma otra vez.
   */
  inTabs?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  const bottomWithoutFooter = inTabs
    ? bottomPadding({ insetBottom: insets.bottom, tabs: true, fab: true })
    : insets.bottom + theme.space['9'];

  const padding = {
    paddingTop: insets.top + theme.space['3'],
    // Con footer, el margen de abajo lo pone el footer.
    paddingBottom: footer != null ? theme.space['6'] : bottomWithoutFooter,
    paddingHorizontal: theme.space['5'],
  };

  const body = scroll ? (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padding, style]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}

      {footer != null && (
        <View
          style={{
            paddingHorizontal: theme.space['5'],
            paddingTop: theme.space['3'],
            // Con el teclado abierto no hace falta el margen del indicador
            // de inicio: el teclado ya ocupa esa zona.
            paddingBottom: keyboardVisible ? theme.space['3'] : insets.bottom + theme.space['3'],
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

type SpaceKey = keyof ReturnType<typeof useTheme>['space'];

export function Stack({
  children,
  gap = '4',
  style,
}: {
  children: ReactNode;
  gap?: SpaceKey;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return <View style={[{ gap: theme.space[gap] }, style]}>{children}</View>;
}

export function Row({
  children,
  gap = '2',
  align = 'center',
  justify = 'flex-start',
  style,
}: {
  children: ReactNode;
  gap?: SpaceKey;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        { flexDirection: 'row', gap: theme.space[gap], alignItems: align, justifyContent: justify },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Spacer({ size = '4' }: { size?: SpaceKey }) {
  const theme = useTheme();
  return <View style={{ height: theme.space[size] }} />;
}

/* ────────────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'sunken' | 'brand' | 'shared';
}) {
  const theme = useTheme();

  const backgroundColor = {
    surface: theme.colors.surface,
    sunken: theme.colors.surfaceSunken,
    brand: theme.colors.brandSoft,
    shared: theme.colors.sharedSoft,
  }[tone];

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: theme.radius.lg,
          padding: theme.space['5'],
          borderWidth: tone === 'surface' ? 1 : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** §15 · "PRÓXIMOS PAGOS ... Ver todos" */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <Row justify="space-between" align="baseline">
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {action}
    </Row>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}
