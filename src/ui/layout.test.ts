import { describe, it, expect } from 'vitest';
import {
  bottomPadding,
  CONTENT_BOTTOM,
  FAB_GAP,
  FAB_HEIGHT,
  fabBottom,
  TAB_BAR_BASE,
} from './layout';

/**
 * El espacio en blanco al final de las pestañas (15/10).
 *
 * La barra de pestañas está EN el flujo y su alto ya incluye el inset inferior
 * (49 + inset): la escena termina arriba de la barra. Sumar `insets.bottom`
 * otra vez, y reservar lugar para el botón Agregar donde no está, dejaba entre
 * 84 y 130pt de blanco.
 */
describe('bottomPadding · dentro de las pestañas', () => {
  it('no vuelve a sumar el inset: la barra ya lo incluye', () => {
    const withNotch = bottomPadding({ insetBottom: 34, tabs: true, fab: false });
    const noNotch = bottomPadding({ insetBottom: 0, tabs: true, fab: false });
    expect(withNotch).toBe(noNotch);
  });

  it('sin botón Agregar solo queda el colchón mínimo', () => {
    expect(bottomPadding({ insetBottom: 34, tabs: true, fab: false })).toBe(CONTENT_BOTTOM);
    expect(CONTENT_BOTTOM).toBe(24);
  });

  it('con botón Agregar despeja el botón entero, sin sobrar', () => {
    // El botón ocupa FAB_GAP + FAB_HEIGHT sobre la barra, más el colchón.
    expect(bottomPadding({ insetBottom: 34, tabs: true, fab: true })).toBe(
      FAB_GAP + FAB_HEIGHT + CONTENT_BOTTOM,
    );
    expect(bottomPadding({ insetBottom: 34, tabs: true, fab: true })).toBe(92);
  });
});

describe('bottomPadding · fuera de las pestañas', () => {
  it('suma el inset, porque ninguna barra lo incluye', () => {
    expect(bottomPadding({ insetBottom: 34, tabs: false, fab: false })).toBe(34 + CONTENT_BOTTOM);
    expect(bottomPadding({ insetBottom: 0, tabs: false, fab: false })).toBe(CONTENT_BOTTOM);
  });

  it('no hay botón flotante sin pestañas: pedirlo no reserva nada', () => {
    expect(bottomPadding({ insetBottom: 34, tabs: false, fab: true })).toBe(34 + CONTENT_BOTTOM);
  });
});

describe('fabBottom · dónde se apoya el botón Agregar', () => {
  it('sobre la barra de pestañas (49 + inset) con el aire de siempre', () => {
    expect(fabBottom(34)).toBe(34 + TAB_BAR_BASE + FAB_GAP);
    expect(fabBottom(0)).toBe(TAB_BAR_BASE + FAB_GAP);
  });

  it('coincide con lo que bottomPadding despeja: ni tapa ni sobra', () => {
    // El borde de arriba del botón, medido desde arriba de la barra.
    const topOfFabOverBar = fabBottom(34) - (34 + TAB_BAR_BASE) + FAB_HEIGHT;
    expect(bottomPadding({ insetBottom: 34, tabs: true, fab: true })).toBe(
      topOfFabOverBar + CONTENT_BOTTOM,
    );
  });
});
