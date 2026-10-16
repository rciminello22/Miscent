import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Segmented, Stack, Text, TextField } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { SpaceCard } from './SpaceCard';
import type { SpaceRowModel } from './spaceRow';
import {
  SPACE_FILTERS,
  emptyResultLine,
  isNarrowed,
  shownLine,
  showsFilter,
  showsSearch,
  visibleSpaces,
  type SpaceFilter,
} from './spaceListOrder';

/**
 * 3ii · la lista de espacios de Compartidos. Presentacional: recibe las filas
 * armadas y avisa cuál se abre; el filtro y la búsqueda son estado de la
 * pantalla, no un dato guardado (un filtro que sobrevive esconde espacios).
 *
 * Orden por defecto: del abierto más recientemente al menos reciente. Filtro
 * "Todos · Para mirar · A mano" desde 5 espacios; búsqueda desde 9. Los saldos
 * nunca se suman entre espacios (Caso 17): cada fila lleva sus cuentas.
 */
export function SpaceListView({
  rows,
  onOpen,
}: {
  rows: readonly SpaceRowModel[];
  onOpen: (spaceId: string) => void;
}) {
  const [filter, setFilter] = useState<SpaceFilter>('all');
  const [query, setQuery] = useState('');

  const total = rows.length;
  const view = { filter, query };
  const visible = visibleSpaces(
    rows.map((row) => row.item),
    view,
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const line = shownLine({
    shown: visible.length,
    total,
    narrowed: isNarrowed(total, view),
  });

  return (
    <Stack gap="3">
      {showsFilter(total) && (
        <Segmented label="Mostrar" options={SPACE_FILTERS} value={filter} onChange={setFilter} />
      )}
      {showsSearch(total) && (
        <TextField
          variant="shared"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por espacio o persona"
          accessibilityLabel="Buscar por espacio o persona"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      )}

      {visible.map((item, index) => {
        const row = byId.get(item.id);
        return row == null ? null : (
          <Animated.View
            key={row.id}
            entering={FadeInDown.delay(stagger(index, 60)).duration(duration.base)}
          >
            <SpaceCard row={row} onPress={() => onOpen(row.id)} />
          </Animated.View>
        );
      })}

      {visible.length === 0 && total > 0 && (
        <Text variant="small" tone="muted" align="center">
          {emptyResultLine(view)}
        </Text>
      )}

      {line != null && (
        <Text variant="caption" tone="muted" align="center">
          {line}
        </Text>
      )}
    </Stack>
  );
}
