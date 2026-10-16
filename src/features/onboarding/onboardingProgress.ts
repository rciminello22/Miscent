/**
 * UX-22 · el progreso de O3 (§13), calculado sobre los pasos que de verdad se
 * recorren. TS puro.
 *
 * Hay dos ramas: Deuda solo existe si hay tarjetas, y Pagados solo si quien
 * activa la cuenta viniendo de invitado pagó gastos del espacio sin medio.
 * `listo` es el resultado, no un paso: la barra se llena en el último paso real.
 */

import type { IsoDate } from '@domain/calendar';
import { activePaymentMethods } from '@domain/cards';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import type { PersonalFacts } from '@domain/types';

/** `conQue` es "¿Con qué pagaste estos gastos?" (la pantalla `pagados`). */
export type OnboardingStep = 'ingreso' | 'tarjetas' | 'deuda' | 'conQue' | 'fijos';

export function onboardingBranches(
  facts: PersonalFacts,
  today: IsoDate,
): { hasCards: boolean; hasPaidByMe: boolean } {
  return {
    hasCards: activePaymentMethods(facts.paymentMethods).some((method) => method.kind === 'card'),
    // §11 paso 4: lo que pagó él mismo como invitado también se pregunta.
    hasPaidByMe: facts.spaces.some(
      (membership) => paidByMeWithoutMethod(membership, today, { includeOwn: true }).length > 0,
    ),
  };
}

export function onboardingProgress(
  step: OnboardingStep,
  branches: { hasCards: boolean; hasPaidByMe: boolean },
): { step: number; total: number } {
  // Una pantalla que se está mostrando es un paso, aunque la rama no la anticipara.
  const steps: OnboardingStep[] = [
    'ingreso',
    'tarjetas',
    ...(branches.hasCards || step === 'deuda' ? (['deuda'] as const) : []),
    ...(branches.hasPaidByMe || step === 'conQue' ? (['conQue'] as const) : []),
    'fijos',
  ];

  return { step: steps.indexOf(step) + 1, total: steps.length };
}
