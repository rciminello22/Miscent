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

/**
 * Cerrar o volver, SIEMPRE con salida.
 *
 * `router.back()` a secas no hace nada si la pantalla se abrió sin historial
 * (con un replace, un deep link, después del login): el usuario quedaba
 * atrapado, sin forma de salir con la cruz ni con la flecha. Sin historial,
 * se aterriza en la raíz, que decide la pantalla principal según la cuenta.
 */
export function goBack(router: AppRouter): void {
  if (router.canGoBack()) router.back();
  else resetTo(router, '/');
}
