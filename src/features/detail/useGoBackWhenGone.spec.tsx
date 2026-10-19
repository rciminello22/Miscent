import { renderHook } from '@testing-library/react-native';
import { useGoBackWhenGone } from './useGoBackWhenGone';

/**
 * Quitar un espacio del historial · el detalle de solo lectura de ese espacio
 * deja de ser alcanzable. Si alguien lo tiene abierto cuando la foto se quita,
 * la pantalla vuelve con `goBack` (nunca con un `replace` desde un efecto).
 */

const mockGoBack = jest.fn();
const mockRouter = { canGoBack: () => true, back: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/shared/navigation', () => ({
  goBack: (router: unknown) => mockGoBack(router),
}));

beforeEach(() => mockGoBack.mockClear());

describe('useGoBackWhenGone', () => {
  it('mientras el espacio sigue en el historial no hace nada', async () => {
    await renderHook(() => useGoBackWhenGone(false));

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('cuando el espacio ya no está, vuelve', async () => {
    await renderHook(() => useGoBackWhenGone(true));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledWith(mockRouter);
  });

  it('si desaparece mientras está abierta, vuelve una sola vez', async () => {
    const { rerender } = await renderHook(
      (gone: boolean) => useGoBackWhenGone(gone),
      { initialProps: false },
    );
    expect(mockGoBack).not.toHaveBeenCalled();

    await rerender(true);
    await rerender(true);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
