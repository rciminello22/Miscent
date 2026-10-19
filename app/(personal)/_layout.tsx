import { View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { isInsideSpace } from '@/features/spaces/spaceNavigation';
import { FabVisibilityProvider, useFabHidden } from '@/features/shared/fabVisibility';
import { CalendarRange, House, Plus, ReceiptText, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { FAB_HEIGHT, fabBottom } from '@/ui/layout';

/**
 * §14 Estado A · usuario con cuenta personal.
 *
 * Cuatro secciones, y cada una responde UNA pregunta:
 *   Inicio       · ¿Qué pasó con mi plata este mes?
 *   Movimientos  · ¿Qué registré?
 *   Futuro       · ¿Cómo vienen mis próximos meses?
 *   Compartidos  · lista de espacios
 *
 * El "+ Agregar" no es una sección: es una acción, y la spec la quiere
 * "siempre visible". Por eso va como botón flotante y no como quinta pestaña.
 * Excepción (9/10): dentro de un espacio se oculta, y queda el del espacio.
 *
 * Compartidos es un stack: cada espacio se abre ADENTRO de la pestaña, con la
 * barra visible.
 */
export default function PersonalLayout() {
  return (
    <FabVisibilityProvider>
      <PersonalTabs />
    </FabVisibilityProvider>
  );
}

function PersonalTabs() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.background },
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
          tabBarLabelStyle: { ...theme.typography.caption, marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="inicio"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => <House size={size - 2} color={color} />,
          }}
        />
        <Tabs.Screen
          name="movimientos"
          options={{
            title: 'Movimientos',
            tabBarIcon: ({ color, size }) => <ReceiptText size={size - 2} color={color} />,
          }}
        />
        <Tabs.Screen
          name="futuro"
          options={{
            title: 'Futuro',
            tabBarIcon: ({ color, size }) => <CalendarRange size={size - 2} color={color} />,
          }}
        />
        <Tabs.Screen
          name="compartidos"
          options={{
            title: 'Compartidos',
            // P23 · la pestaña abre SIEMPRE en la lista: al salir, su stack
            // vuelve a [lista]. Sin esto restauraba el último espacio abierto.
            popToTopOnBlur: true,
            tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
          }}
        />
        {/* §14 · Perfil se abre con un ícono desde Inicio, no es una sección. */}
        <Tabs.Screen name="perfil" options={{ href: null }} />
      </Tabs>

      <AddButton />
    </View>
  );
}

/** §17 · el formulario único Agregar, a un toque desde cualquier sección. */
function AddButton() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const hiddenByScreen = useFabHidden();

  // Dentro de un espacio queda solo su propio "Agregar", que carga en el
  // espacio. Decisión del 9/10 (ver isInsideSpace).
  if (isInsideSpace(pathname)) return null;
  // Movimientos: un mes que ya pasó, o el mes en curso vacío (el N1 trae su Agregar).
  if (hiddenByScreen) return null;

  return (
    <Pressable
      onPress={() => router.push('/agregar')}
      accessibilityRole="button"
      accessibilityLabel="Agregar un gasto o un ingreso"
      style={{
        position: 'absolute',
        right: theme.space['5'],
        // Apoyado sobre la barra de pestañas (49 + inset), no a ojo.
        bottom: fabBottom(insets.bottom),
        height: FAB_HEIGHT,
        paddingHorizontal: theme.space['5'],
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.brand,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['2'],
        shadowColor: '#000',
        shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Plus size={18} color={theme.colors.textOnBrand} />
      <Text variant="smallMedium" tone="onBrand">
        Agregar
      </Text>
    </Pressable>
  );
}
