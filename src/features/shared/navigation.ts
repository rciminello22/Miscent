import type { Href, useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Aterriza en `href` con el historial limpio.
 *
 * Para los cambios de árbol (§14): entrar después del login, salir de un
 * espacio a la pantalla principal. Un `replace` solo cambia la pantalla de
 * arriba y deja todo lo de abajo: después del login quedaban bienvenida,
 * email y código debajo de la app, y "volver" (o el gesto de iOS) caía ahí.
 */
export function resetTo(router: AppRouter, href: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
