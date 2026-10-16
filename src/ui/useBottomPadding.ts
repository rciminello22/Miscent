import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomPadding } from './layout';

/**
 * El padding de abajo del contenido que scrollea (la cuenta está en `layout.ts`).
 *
 *   tabs · la pantalla está dentro de la barra de pestañas
 *   fab  · el botón flotante Agregar está a la vista sobre ella
 */
export function useBottomPadding(options: { tabs: boolean; fab?: boolean }): number {
  const insets = useSafeAreaInsets();
  return bottomPadding({ insetBottom: insets.bottom, tabs: options.tabs, fab: options.fab ?? false });
}
