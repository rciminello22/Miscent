import { describe, it, expect } from 'vitest';
import type { SharedBalance } from '@domain/shared-balance';
import { balanceScaleState } from './balanceScaleState';

/**
 * La balanza dibuja el MISMO escalar que la frase de `balanceSentence`
 * (`calculateSharedBalance`, que sí descuenta los pagos): se inclina hacia
 * quien puso de más, con una inclinación FIJA. Es un estado, no una proporción.
 *
 * Tono neutral (§4.13): sin rojo y sin flecha, la app no es árbitro.
 */
function balance(amount: number, otherMemberName = 'Martina'): SharedBalance {
  return { amount, viewerSlot: 1, otherMemberName, settled: amount === 0 };
}

const active = { displayName: 'Martina', status: 'active' as const };

describe('balanceScaleState · hacia dónde se inclina', () => {
  it('el otro te debe: puso de más el usuario, se inclina hacia vos (izquierda)', () => {
    const state = balanceScaleState({ balance: balance(20_000), myName: 'Renzo', other: active });
    expect(state.direction).toBe(-1);
    expect(state.leaning).toBe('me');
    expect(state.showCheck).toBe(false);
  });

  it('le debés al otro: puso de más el otro, se inclina hacia él (derecha)', () => {
    const state = balanceScaleState({
      balance: balance(-20_000, 'Renzo'),
      myName: 'Martina',
      other: { displayName: 'Renzo', status: 'active' },
    });
    expect(state.direction).toBe(1);
    expect(state.leaning).toBe('other');
    expect(state.showCheck).toBe(false);
  });

  it('están a mano: nivelada y con tilde', () => {
    const state = balanceScaleState({ balance: balance(0), myName: 'Renzo', other: active });
    expect(state.direction).toBe(0);
    expect(state.leaning).toBeNull();
    expect(state.showCheck).toBe(true);
  });

  it('es un estado y no una proporción: $1 y $1.000.000 se inclinan igual', () => {
    const small = balanceScaleState({ balance: balance(1), myName: 'Renzo', other: active });
    const big = balanceScaleState({ balance: balance(1_000_000), myName: 'Renzo', other: active });
    expect(small.direction).toBe(big.direction);
    expect(small.direction).toBe(-1);
  });
});

describe('balanceScaleState · las dos personas', () => {
  it('vos a la izquierda con tu inicial; el otro con la suya, ambos con relleno', () => {
    const state = balanceScaleState({ balance: balance(20_000), myName: 'Renzo', other: active });
    expect(state.me).toEqual({ initial: 'R', label: 'Vos', dashed: false });
    expect(state.other).toEqual({ initial: 'M', label: 'Martina', dashed: false });
  });

  it('si el otro todavía no entró, su círculo es punteado (E-02: el saldo se dibuja igual)', () => {
    const state = balanceScaleState({
      balance: balance(120_000),
      myName: 'Renzo',
      other: { displayName: 'Martina', status: 'no_access' },
    });
    expect(state.other.dashed).toBe(true);
    expect(state.me.dashed).toBe(false);
    expect(state.direction).toBe(-1);
  });

  it('un ex miembro también va punteado', () => {
    const state = balanceScaleState({
      balance: balance(0),
      myName: 'Renzo',
      other: { displayName: 'Martina', status: 'former' },
    });
    expect(state.other.dashed).toBe(true);
  });

  it('la inicial sale del nombre, en mayúscula y sin espacios; nunca queda vacía', () => {
    const lower = balanceScaleState({
      balance: balance(5),
      myName: '  renzo',
      other: { displayName: 'ámbar', status: 'active' },
    });
    expect(lower.me.initial).toBe('R');
    expect(lower.other.initial).toBe('Á');

    const empty = balanceScaleState({
      balance: balance(5),
      myName: '',
      other: { displayName: '   ', status: 'active' },
    });
    expect(empty.me.initial).toBe('?');
    expect(empty.other.initial).toBe('?');
  });
});

describe('balanceScaleState · el label accesible dice lo mismo que la frase, con las cifras en palabras', () => {
  it('inclinada hacia vos', () => {
    const state = balanceScaleState({ balance: balance(20_000), myName: 'Renzo', other: active });
    expect(state.accessibilityLabel).toBe(
      'Balanza inclinada hacia vos. Martina te debe 20.000 pesos.',
    );
  });

  it('inclinada hacia el otro', () => {
    const state = balanceScaleState({
      balance: balance(-20_000, 'Renzo'),
      myName: 'Martina',
      other: { displayName: 'Renzo', status: 'active' },
    });
    expect(state.accessibilityLabel).toBe(
      'Balanza inclinada hacia Renzo. Le debés 20.000 pesos a Renzo.',
    );
  });

  it('nivelada', () => {
    const state = balanceScaleState({ balance: balance(0), myName: 'Renzo', other: active });
    expect(state.accessibilityLabel).toBe('Balanza nivelada, con una tilde. Están a mano.');
  });

  it('avisa si el otro todavía no entró', () => {
    const state = balanceScaleState({
      balance: balance(120_000),
      myName: 'Renzo',
      other: { displayName: 'Martina', status: 'no_access' },
    });
    expect(state.accessibilityLabel).toBe(
      'Balanza inclinada hacia vos. Martina te debe 120.000 pesos. Martina todavía no entró.',
    );
  });

  it('avisa si el otro ya no está', () => {
    const state = balanceScaleState({
      balance: balance(0),
      myName: 'Renzo',
      other: { displayName: 'Martina', status: 'former' },
    });
    expect(state.accessibilityLabel).toBe(
      'Balanza nivelada, con una tilde. Están a mano. Martina es ex miembro.',
    );
  });

  it('nunca lleva un signo de pesos ni una flecha: las cifras van en palabras', () => {
    const state = balanceScaleState({ balance: balance(20_000), myName: 'Renzo', other: active });
    expect(state.accessibilityLabel).not.toMatch(/[$→←↑↓]/);
  });
});
