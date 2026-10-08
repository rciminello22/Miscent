import {
  Bus,
  Croissant,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  Lamp,
  Laptop,
  type LucideIcon,
  Monitor,
  MoreHorizontal,
  PawPrint,
  Phone,
  Pill,
  Shirt,
  ShoppingCart,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react-native';
import type { Category } from '@domain/types';

/**
 * P13 · categorías FIJAS, no editables.
 *
 * La recomendación de §38 es clara, y el motivo es el usuario objetivo (§2):
 * alguien que no quiere armar una planilla. Pedirle que diseñe su propia
 * taxonomía de categorías es exactamente el trabajo del que la app lo libera.
 *
 * El orden importa: §17 pide "más usadas primero". Acá está el orden por
 * defecto; cuando haya uso real, la grilla lo reordena por frecuencia.
 */

export type CategoryMeta = {
  value: Category;
  label: string;
  icon: LucideIcon;
};

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { value: 'supermercado', label: 'Supermercado', icon: ShoppingCart },
  { value: 'gastronomia', label: 'Gastronomía', icon: Croissant },
  { value: 'transporte', label: 'Transporte', icon: Bus },
  { value: 'alquiler', label: 'Alquiler', icon: Home },
  { value: 'expensas', label: 'Expensas', icon: Landmark },
  { value: 'servicios', label: 'Servicios', icon: Zap },
  { value: 'internet', label: 'Internet', icon: Monitor },
  { value: 'celular', label: 'Celular', icon: Phone },
  { value: 'salud', label: 'Salud', icon: HeartPulse },
  { value: 'farmacia', label: 'Farmacia', icon: Pill },
  { value: 'hogar', label: 'Hogar', icon: Lamp },
  { value: 'ropa', label: 'Ropa', icon: Shirt },
  { value: 'ocio', label: 'Ocio', icon: Sparkles },
  { value: 'suscripciones', label: 'Suscripciones', icon: Laptop },
  { value: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { value: 'educacion', label: 'Educación', icon: GraduationCap },
  { value: 'mascotas', label: 'Mascotas', icon: PawPrint },
  { value: 'impuestos', label: 'Impuestos', icon: Landmark },
  { value: 'regalos', label: 'Regalos', icon: Gift },
  { value: 'otros', label: 'Otros', icon: MoreHorizontal },
];

/** §17 campo 1 · "Los ingresos son siempre personales". */
export const INCOME_CATEGORIES: CategoryMeta[] = [
  { value: 'sueldo', label: 'Sueldo', icon: Wallet },
  { value: 'extra', label: 'Extra', icon: Heart },
];

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoryMeta(category: Category): CategoryMeta {
  return ALL.find((meta) => meta.value === category) ?? ALL[ALL.length - 1]!;
}

export function categoryLabel(category: Category): string {
  return categoryMeta(category).label;
}

/**
 * §17 · "más usadas primero". Reordena según lo que el usuario ya registró,
 * sin esconder ninguna: las usadas suben, el resto conserva su orden.
 */
export function orderByUsage(
  categories: readonly CategoryMeta[],
  usage: ReadonlyMap<Category, number>,
): CategoryMeta[] {
  return [...categories].sort((a, b) => {
    const diff = (usage.get(b.value) ?? 0) - (usage.get(a.value) ?? 0);
    if (diff !== 0) return diff;
    return categories.indexOf(a) - categories.indexOf(b);
  });
}
