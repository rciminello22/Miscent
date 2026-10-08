/**
 * Sistema de movimiento.
 *
 * Regla única y no negociable: **una animación existe para responder "¿qué
 * acaba de pasar?"**. Si no explica nada, no va.
 *
 * De ahí salen las duraciones: son cortas porque el objetivo es que el
 * usuario entienda un cambio, no que admire una transición. Nada pasa de
 * 420ms, y lo que se toca responde en menos de 150ms.
 */

import { Easing, ReduceMotion, withSpring, withTiming } from 'react-native-reanimated';

export const duration = {
  /** Feedback de un toque: tiene que sentirse instantáneo. */
  instant: 120,
  /** Cambio de estado chico: un chip que se selecciona, un color. */
  quick: 180,
  /** El estándar: una cifra que cambia, una barra que se mueve. */
  base: 280,
  /** Lo que tiene que leerse mientras se mueve: la barra del radar. */
  deliberate: 380,
} as const;

/**
 * Curva de salida: arranca rápido y frena. Es la que corresponde a algo que
 * ya pasó y se está mostrando (un valor que se actualizó).
 */
export const easing = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.45, 0, 0.55, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
} as const;

/**
 * Respeta "Reducir movimiento" del sistema en TODO.
 * No es un extra de accesibilidad: para alguien con sensibilidad vestibular,
 * una app que ignora ese ajuste es una app que no puede usar.
 */
const reduceMotion = ReduceMotion.System;

export function timing(toValue: number, overrides?: { duration?: number; easing?: typeof easing.out }) {
  return withTiming(toValue, {
    duration: overrides?.duration ?? duration.base,
    easing: overrides?.easing ?? easing.out,
    reduceMotion,
  });
}

/** Para lo que se mueve por un gesto o un toque: el resorte se siente físico. */
export function spring(toValue: number) {
  return withSpring(toValue, {
    damping: 22,
    stiffness: 260,
    mass: 0.7,
    reduceMotion,
  });
}

/**
 * La transición de la barra del radar y de las barras por mes.
 * Más lenta a propósito: el movimiento ES la información (se ve qué segmento
 * creció y cuánto), así que tiene que poder seguirse con la vista.
 */
export function barTransition(toValue: number) {
  return withTiming(toValue, {
    duration: duration.deliberate,
    easing: easing.out,
    reduceMotion,
  });
}

/** Cascada: cada elemento entra `step` ms después del anterior. */
export function stagger(index: number, step = 40): number {
  return index * step;
}

/** Escala de un elemento presionado. Sutil: se siente, no se mira. */
export const pressScale = 0.975;
