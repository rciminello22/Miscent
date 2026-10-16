import { StyleSheet } from 'react-native';
import { withSpring } from 'react-native-reanimated';
import { renderWithTheme } from '@/test/render';
import { BalanceScale, type BalanceScaleProps } from './BalanceScale';

/*
 * El mock de Reanimated no trae `useReducedMotion`, y `withSpring` se espía
 * para ver hacia dónde se manda a girar. Los valores compartidos del mock no
 * son reactivos: lo que se ve en el primer dibujo es el estado de PARTIDA.
 */
const mockReducedMotion = { value: false };
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useReducedMotion: () => mockReducedMotion.value,
    withSpring: jest.fn((toValue: number) => toValue),
  };
});

/** Nivel 3 · la balanza: el label accesible y los estados nivelado, inclinado y punteado. */
const base: BalanceScaleProps = {
  direction: -1,
  showCheck: false,
  me: { initial: 'R', label: 'Vos', dashed: false },
  other: { initial: 'M', label: 'Martina', dashed: false },
  accessibilityLabel: 'Balanza inclinada hacia vos. Martina te debe 20.000 pesos.',
};

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

function rotation(view: Awaited<ReturnType<typeof renderWithTheme>>) {
  const style = flat(view.getByTestId('balance-scale-beam'));
  const transform = style.transform as { rotate: string }[];
  return transform[0]!.rotate;
}

beforeEach(() => {
  mockReducedMotion.value = false;
  (withSpring as jest.Mock).mockClear();
});

describe('BalanceScale · el label accesible', () => {
  it('es una imagen con el label que le dan, con las cifras en palabras', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} />);
    const scale = view.getByLabelText('Balanza inclinada hacia vos. Martina te debe 20.000 pesos.');
    expect(scale.props.accessibilityRole).toBe('image');
    expect(scale.props.accessible).toBe(true);
  });

  it('también en miniatura', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} size="mini" />);
    expect(view.getByLabelText(base.accessibilityLabel)).toBeTruthy();
  });
});

describe('BalanceScale · las dos personas', () => {
  it('muestra las iniciales y los nombres, nunca un email', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} />);
    expect(view.getByText('R')).toBeTruthy();
    expect(view.getByText('M')).toBeTruthy();
    expect(view.getByText('Vos')).toBeTruthy();
    expect(view.getByText('Martina')).toBeTruthy();
    expect(view.queryByText(/@/)).toBeNull();
  });

  it('la miniatura también', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} size="mini" />);
    expect(view.getByText('R')).toBeTruthy();
    expect(view.getByText('M')).toBeTruthy();
    expect(view.getByText('Martina')).toBeTruthy();
  });

  it('si el otro todavía no entró, su círculo va punteado (grande)', async () => {
    const solid = await renderWithTheme(<BalanceScale {...base} />);
    expect(solid.getByTestId('balance-scale-other-circle').props.strokeDasharray).toBeUndefined();

    const dashed = await renderWithTheme(
      <BalanceScale {...base} other={{ initial: 'M', label: 'Martina', dashed: true }} />,
    );
    expect(dashed.getByTestId('balance-scale-other-circle').props.strokeDasharray).toEqual(['5', '4']);
  });

  it('si el otro todavía no entró, su círculo va punteado (miniatura)', async () => {
    const solid = await renderWithTheme(<BalanceScale {...base} size="mini" />);
    expect(flat(solid.getByTestId('balance-scale-other')).borderStyle).toBe('solid');

    const dashed = await renderWithTheme(
      <BalanceScale
        {...base}
        size="mini"
        other={{ initial: 'M', label: 'Martina', dashed: true }}
      />,
    );
    expect(flat(dashed.getByTestId('balance-scale-other')).borderStyle).toBe('dashed');
    // Vos nunca va punteado.
    expect(flat(dashed.getByTestId('balance-scale-me')).borderStyle).toBe('solid');
  });
});

describe('BalanceScale · nivelada o inclinada', () => {
  it('se inclina hacia vos (izquierda) con una inclinación fija', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} direction={-1} />);
    expect(rotation(view)).toBe('-8deg');
  });

  it('se inclina hacia el otro (derecha), la misma cantidad', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} direction={1} />);
    expect(rotation(view)).toBe('8deg');
  });

  it('nivelada: el travesaño horizontal y el tilde a la vista', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} direction={0} showCheck />);
    expect(rotation(view)).toBe('0deg');
    expect(flat(view.getByTestId('balance-scale-check')).opacity).toBe(1);
  });

  it('inclinada: sin tilde', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} direction={-1} />);
    expect(flat(view.getByTestId('balance-scale-check')).opacity).toBe(0);
  });

  it('la miniatura se inclina y se nivela igual', async () => {
    const tilted = await renderWithTheme(<BalanceScale {...base} size="mini" direction={1} />);
    expect(rotation(tilted)).toBe('8deg');
    const level = await renderWithTheme(<BalanceScale {...base} size="mini" direction={0} showCheck />);
    expect(rotation(level)).toBe('0deg');
    expect(flat(level.getByTestId('balance-scale-check')).opacity).toBe(1);
  });
});

describe('BalanceScale · la animación', () => {
  it('gira con un resorte hacia el nuevo estado cuando cambia el saldo', async () => {
    const view = await renderWithTheme(<BalanceScale {...base} direction={-1} />);
    (withSpring as jest.Mock).mockClear();

    await view.rerender(<BalanceScale {...base} direction={0} showCheck />);
    expect(withSpring).toHaveBeenCalledWith(0, expect.objectContaining({ overshootClamping: true }));
  });

  it('la amortiguación es alta: sin rebote de juguete', async () => {
    await renderWithTheme(<BalanceScale {...base} direction={1} />);
    const config = (withSpring as jest.Mock).mock.calls.at(-1)![1] as {
      damping: number;
      stiffness: number;
      mass: number;
    };
    // Amortiguación crítica = 2 · √(rigidez · masa). Por encima, no oscila.
    expect(config.damping).toBeGreaterThanOrEqual(2 * Math.sqrt(config.stiffness * config.mass));
  });

  it('al volver a la pantalla gira DESDE el estado anterior al nuevo', async () => {
    const view = await renderWithTheme(
      <BalanceScale key="antes" {...base} direction={-1} memoryKey="casa" />,
    );
    expect(rotation(view)).toBe('-8deg');

    (withSpring as jest.Mock).mockClear();
    // Se vuelve a la pantalla (otra instancia: otra `key`) y mientras tanto se
    // registró un pago: ahora están a mano.
    await view.rerender(
      <BalanceScale key="despues" {...base} direction={0} showCheck memoryKey="casa" />,
    );
    // Arranca donde estaba (inclinada) y el resorte la lleva al nivel.
    expect(rotation(view)).toBe('-8deg');
    expect(withSpring).toHaveBeenCalledWith(0, expect.anything());
  });

  it('una balanza que nunca se dibujó aparece directamente en su lugar', async () => {
    const view = await renderWithTheme(
      <BalanceScale {...base} direction={1} memoryKey="viaje-nunca-visto" />,
    );
    expect(rotation(view)).toBe('8deg');
  });

  it('con "Reducir movimiento" no hay animación: aparece en su lugar', async () => {
    mockReducedMotion.value = true;

    const view = await renderWithTheme(
      <BalanceScale key="antes" {...base} direction={-1} memoryKey="reducido" />,
    );
    (withSpring as jest.Mock).mockClear();

    await view.rerender(
      <BalanceScale key="despues" {...base} direction={0} showCheck memoryKey="reducido" />,
    );
    expect(withSpring).not.toHaveBeenCalled();
    expect(rotation(view)).toBe('0deg');
    expect(flat(view.getByTestId('balance-scale-check')).opacity).toBe(1);
  });
});
