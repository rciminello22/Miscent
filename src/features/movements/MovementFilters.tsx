import { ScrollView } from 'react-native';
import { User, Users } from 'lucide-react-native';
import { Chip } from '@/features/add/fields';
import { useTheme } from '@/ui/theme';
import type { MovementFilter } from './buildMovementList';
import { FilterSegmented } from './FilterSegmented';
import { filterStyle } from './movementsTab';
import type { FilterSegment } from './movementsView';

/**
 * §16 · los filtros de la lista. Se ven como filtros: uno elegido a la vez, con
 * el estado a la vista y sin chevron. Con un espacio, el control segmentado
 * "Todos · Personales · Casa"; con dos o más, chips desplazables, uno por
 * espacio (elegido: relleno y tilde; no elegido: borde). Filtran la lista de la
 * misma pantalla: no abren nada.
 */
export function MovementFilters({
  segments,
  value,
  onChange,
}: {
  segments: readonly FilterSegment[];
  value: MovementFilter;
  onChange: (next: MovementFilter) => void;
}) {
  const theme = useTheme();
  const style = filterStyle(segments);

  if (style === 'none') return null;
  if (style === 'segmented') {
    return <FilterSegmented segments={segments} value={value} onChange={onChange} />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      contentContainerStyle={{ gap: theme.space['2'], paddingVertical: theme.space['2'] }}
    >
      {segments.map((segment) => {
        const selected = segment.key === value;
        const color = selected ? theme.colors.textOnBrand : theme.colors.textSecondary;
        return (
          <Chip
            key={segment.key}
            label={segment.label}
            selected={selected}
            onPress={() => onChange(segment.key)}
            icon={
              segment.kind === 'personal' ? (
                <User size={14} color={color} />
              ) : segment.kind === 'space' ? (
                <Users size={14} color={color} />
              ) : undefined
            }
          />
        );
      })}
    </ScrollView>
  );
}
