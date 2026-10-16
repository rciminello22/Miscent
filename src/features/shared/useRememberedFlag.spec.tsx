import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRememberedFlag } from './useRememberedFlag';

/**
 * Una marca que sobrevive cerrar la app. `mark` la prende; `forget` la apaga
 * (un interruptor: la variante de prueba de Movimientos).
 */

const KEY = 'radar.test.flag';

describe('useRememberedFlag', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mientras lee, no se sabe (null); sin marca guardada es "no"', async () => {
    const { result } = await renderHook(() => useRememberedFlag(KEY));

    await waitFor(() => expect(result.current[0]).toBe(false));
  });

  it('mark la prende y la guarda', async () => {
    const { result } = await renderHook(() => useRememberedFlag(KEY));
    await waitFor(() => expect(result.current[0]).toBe(false));

    await act(async () => result.current[1]());

    expect(result.current[0]).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('1');
  });

  it('forget la apaga, también en el almacenamiento', async () => {
    await AsyncStorage.setItem(KEY, '1');
    const { result } = await renderHook(() => useRememberedFlag(KEY));
    await waitFor(() => expect(result.current[0]).toBe(true));

    await act(async () => result.current[2]());

    expect(result.current[0]).toBe(false);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });
});
