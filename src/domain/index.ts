/**
 * El dominio de Radar.
 *
 * TypeScript puro, cero dependencias: ni React, ni Supabase, ni `Date.now()`.
 * La fecha de hoy SIEMPRE se inyecta, porque si no, nada de esto se puede
 * testear.
 *
 * Reglas implementadas (§29): G-01 a G-06 · N-01 a N-10 · T-01 a T-08 ·
 * Q-01 a Q-09 · F-01 a F-04 · C-01 a C-07 · S-01 a S-06 · P-01 a P-04.
 *
 * Verificado contra §29.1 (Casos A–G), §31 (casos de uso) y §36 (criterios).
 */

export * from './calendar';
export * from './money';
export * from './types';
export * from './split';
export * from './cards';
export * from './installments';
export * from './occurrences';
export * from './radar';
export * from './upcoming';
export * from './shared-balance';
export * from './future';
