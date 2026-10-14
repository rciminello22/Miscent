/**
 * Should 8 · categoría sugerida según la descripción. TS puro: se testea en
 * node.
 *
 * Sugiere, nunca elige: la pantalla pregunta "¿Es Supermercado?". Primero
 * mira lo que el usuario ya cargó con esa misma descripción (sus costumbres
 * valen más que una lista), y si no, palabras conocidas.
 *
 * Las palabras de 4 letras o más valen también como comienzo ("super" →
 * "supermercado", "farmac" → "farmacity"); las cortas, solo enteras ("dia" no
 * es "diario").
 */

import type { Category } from '@domain/types';

type Kind = 'expense' | 'income';

const KEYWORDS: Record<Category, readonly string[]> = {
  supermercado: ['super', 'coto', 'carrefour', 'dia', 'jumbo', 'disco', 'vea', 'chino', 'almacen', 'verduleria', 'carniceria', 'mercado', 'changomas', 'walmart'],
  gastronomia: ['resto', 'restaurant', 'restaurante', 'bar', 'cafe', 'pizza', 'delivery', 'rappi', 'pedidosya', 'birra', 'cerveza', 'helado', 'sushi', 'empanadas', 'almuerzo', 'cena', 'comida', 'hamburguesa', 'parrilla'],
  transporte: ['sube', 'nafta', 'uber', 'cabify', 'didi', 'taxi', 'remis', 'colectivo', 'tren', 'subte', 'peaje', 'estacionamiento', 'ypf', 'shell', 'axion', 'combustible'],
  alquiler: ['alquiler'],
  expensas: ['expensas'],
  servicios: ['luz', 'gas', 'agua', 'edenor', 'edesur', 'metrogas', 'naturgy', 'aysa', 'abl'],
  internet: ['internet', 'wifi', 'fibertel', 'telecentro', 'fibra'],
  celular: ['celular', 'claro', 'movistar', 'recarga'],
  salud: ['medico', 'medica', 'prepaga', 'osde', 'swiss', 'galeno', 'dentista', 'odontologo', 'psicologo', 'psicologa', 'consulta', 'kinesiologo', 'analisis', 'turno'],
  farmacia: ['farmacia', 'farmacity', 'remedio', 'remedios', 'medicamento', 'medicamentos'],
  educacion: ['curso', 'facultad', 'universidad', 'colegio', 'escuela', 'libro', 'libros', 'udemy', 'clases'],
  hogar: ['ferreteria', 'limpieza', 'mueble', 'muebles', 'easy', 'sodimac', 'bazar', 'pintura'],
  ropa: ['ropa', 'zapatillas', 'zapatos', 'remera', 'jean', 'campera', 'zara', 'pantalon'],
  ocio: ['cine', 'teatro', 'recital', 'show', 'entradas', 'salida', 'juego', 'steam', 'boliche'],
  suscripciones: ['netflix', 'spotify', 'disney', 'hbo', 'prime', 'youtube', 'icloud', 'chatgpt', 'suscripcion', 'paramount'],
  gimnasio: ['gym', 'gimnasio', 'megatlon', 'sportclub', 'crossfit', 'pilates', 'yoga'],
  mascotas: ['veterinaria', 'vete', 'perro', 'gato', 'balanceado', 'mascota'],
  impuestos: ['monotributo', 'afip', 'arca', 'impuesto', 'impuestos', 'patente', 'inmobiliario', 'ganancias', 'iibb'],
  regalos: ['regalo', 'regalos', 'cumple', 'cumpleanos'],
  otros: [],
  sueldo: ['sueldo', 'salario', 'haberes', 'aguinaldo'],
  extra: ['freelance', 'extra', 'changa', 'venta', 'bono', 'reintegro'],
};

const INCOME: readonly Category[] = ['sueldo', 'extra'];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function matches(token: string, keyword: string): boolean {
  return token === keyword || (keyword.length >= 4 && token.startsWith(keyword));
}

export function suggestCategory(
  description: string,
  kind: Kind,
  history: readonly { description: string | null; category: Category }[],
): Category | null {
  const text = normalize(description);
  if (text === '') return null;
  const allowed = (category: Category) => (kind === 'income') === INCOME.includes(category);

  // 1 · lo que ya cargó con la misma descripción, lo más frecuente.
  const counts = new Map<Category, number>();
  for (const item of history) {
    if (item.description == null || normalize(item.description) !== text) continue;
    if (!allowed(item.category)) continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  const usual = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (usual != null) return usual[0];

  // 2 · palabras conocidas, en el orden en que aparecen.
  const tokens = text.split(/[^a-z0-9]+/).filter((token) => token !== '');
  for (const token of tokens) {
    for (const [category, keywords] of Object.entries(KEYWORDS) as [Category, readonly string[]][]) {
      if (!allowed(category)) continue;
      if (keywords.some((keyword) => matches(token, keyword))) return category;
    }
  }
  return null;
}
