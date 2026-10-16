/**
 * 3ii · la lista de Compartidos cuando crece. TS puro, con test.
 *
 * Orden por defecto: mezclados, del abierto más recientemente al menos reciente
 * (lo que usás va primero). Filtro opcional "Todos · Para mirar · A mano" desde
 * 5 espacios, y búsqueda por nombre del espacio o de la persona desde 9. Con
 * pocos espacios ninguno de los dos controles sobra: la lista entra en pantalla.
 *
 * Los saldos nunca se suman entre espacios (Caso 17): acá solo se ordena y se
 * recorta.
 */

export type SpaceFilter = 'all' | 'watch' | 'even';

export type SpaceListItem = {
  id: string;
  name: string;
  /** El nombre de la otra persona: también se busca por él. */
  otherName: string;
  /** Sus cuentas ya cargaron. Mientras no, no se sabe si hay algo para mirar. */
  ready: boolean;
  /** Lo que está por revisar, ya sumado (`pendingTotal`). */
  pending: number;
  /** El saldo con signo; 0 si están a mano. */
  balance: number;
  /** Cuándo se abrió por última vez en este dispositivo (ms); `null` si nunca o sin dato. */
  lastOpenedAt: number | null;
};

/** El filtro aparece desde esta cantidad de espacios. */
export const FILTER_MIN_SPACES = 5;
/** La búsqueda aparece desde esta cantidad de espacios. */
export const SEARCH_MIN_SPACES = 9;

export const SPACE_FILTERS: readonly { key: SpaceFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'watch', label: 'Para mirar' },
  { key: 'even', label: 'A mano' },
];

export function showsFilter(count: number): boolean {
  return count >= FILTER_MIN_SPACES;
}

export function showsSearch(count: number): boolean {
  return count >= SEARCH_MIN_SPACES;
}

/** Minúsculas y sin tildes, para comparar nombres como los escribe la gente. */
function fold(text: string): string {
  const accents: Record<string, string> = {
    á: 'a',
    é: 'e',
    í: 'i',
    ó: 'o',
    ú: 'u',
    ü: 'u',
    ñ: 'n',
  };
  return Array.from(text.trim().toLowerCase())
    .map((char) => accents[char] ?? char)
    .join('');
}

function compareNames(a: string, b: string): number {
  const left = fold(a);
  const right = fold(b);
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

/**
 * Del abierto más recientemente al menos reciente. Sin dato de apertura, después
 * de los que sí lo tienen, por nombre. No modifica lo que recibe.
 */
export function orderSpaces(items: readonly SpaceListItem[]): SpaceListItem[] {
  return [...items].sort((a, b) => {
    if (a.lastOpenedAt != null && b.lastOpenedAt != null && a.lastOpenedAt !== b.lastOpenedAt) {
      return b.lastOpenedAt - a.lastOpenedAt;
    }
    if (a.lastOpenedAt != null && b.lastOpenedAt == null) return -1;
    if (a.lastOpenedAt == null && b.lastOpenedAt != null) return 1;
    return compareNames(a.name, b.name);
  });
}

/**
 * "Para mirar": algo por revisar o un saldo distinto de cero. Mientras las
 * cuentas no cargaron no se esconde nada.
 */
export function needsLook(item: SpaceListItem): boolean {
  return !item.ready || item.pending > 0 || item.balance !== 0;
}

/**
 * Lo que la lista dibuja: ordenado y recortado por el filtro y la búsqueda. Si
 * el control no corresponde a esta cantidad de espacios, lo guardado se ignora
 * (el filtro de ayer no puede esconder espacios ahora que quedan pocos).
 */
export function visibleSpaces(
  items: readonly SpaceListItem[],
  view: { filter: SpaceFilter; query: string },
): SpaceListItem[] {
  const filter = showsFilter(items.length) ? view.filter : 'all';
  const query = showsSearch(items.length) ? fold(view.query) : '';

  return orderSpaces(items).filter((item) => {
    if (filter === 'watch' && !needsLook(item)) return false;
    if (filter === 'even' && needsLook(item)) return false;
    if (query === '') return true;
    return fold(item.name).includes(query) || fold(item.otherName).includes(query);
  });
}

/** Si el filtro o la búsqueda, que corresponden a esta cantidad, recortan la lista. */
export function isNarrowed(total: number, view: { filter: SpaceFilter; query: string }): boolean {
  const filtering = showsFilter(total) && view.filter !== 'all';
  const searching = showsSearch(total) && view.query.trim() !== '';
  return filtering || searching;
}

/** "Mostrando 3 de 6 espacios": solo con un filtro o una búsqueda aplicados. */
export function shownLine(args: { shown: number; total: number; narrowed: boolean }): string | null {
  return args.narrowed ? `Mostrando ${args.shown} de ${args.total} espacios` : null;
}

/** Lo que se dice cuando el filtro o la búsqueda no dejan ningún espacio. */
export function emptyResultLine(view: { filter: SpaceFilter; query: string }): string {
  const query = view.query.trim();
  if (query !== '') return `Ningún espacio coincide con "${query}".`;
  if (view.filter === 'watch') return 'No hay nada para mirar por ahora.';
  return 'Ningún espacio está a mano todavía.';
}
