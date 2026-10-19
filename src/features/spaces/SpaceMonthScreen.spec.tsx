import {
  MARTINA,
  RENZO,
  memberPayment,
  sharedExpense,
  sharedRecurrence,
  spaceFacts,
} from '@domain/__tests__/fixtures';
import type { SpaceFacts } from '@domain/types';
import { fireEvent, renderWithTheme } from '@/test/render';
import { paymentSentence } from './balanceCopy';
import { SpaceMonthScreen } from './SpaceMonthScreen';

const mockPush = jest.fn();
let mockFacts: SpaceFacts;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock('./useSpaces', () => ({
  useSpace: () => {
    const { expandSpaceOccurrences, spaceHorizon } = require('@domain/occurrences');
    const facts: SpaceFacts = mockFacts;
    return {
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      today: '2026-10-18',
      derived: {
        facts,
        mySlot: 1,
        occurrences: expandSpaceOccurrences(facts, spaceHorizon(facts, '2026-10-18')),
        other: facts.space.members.find((member) => member.slot === 2),
        me: facts.space.members.find((member) => member.slot === 1),
      },
    };
  },
}));

/**
 * U7 · CA-28 · "Eliminar" se ofrece desde el detalle de un gasto, y a ese
 * detalle solo se llegaba desde listas que filtran `balanceDate <= hoy`. Un gasto
 * en cuotas cuya primera cuota cae el mes que viene no se podía tocar en ningún
 * lado: ni editar ni eliminar. El Detalle del mes tiene que llevar a él.
 */
describe('SpaceMonthScreen · lo que se viene se puede abrir', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFacts = spaceFacts({
      expenses: [
        sharedExpense({
          id: 'g-futuro',
          amount: 300_000,
          date: '2026-10-18',
          payerSlot: RENZO,
          description: 'Heladera',
          installments: { count: 3, card: null },
        }),
      ],
      recurrences: [
        sharedRecurrence({
          id: 'r-alquiler',
          amount: 500_000,
          dayOfMonth: 25,
          startMonth: '2026-10',
          payerSlot: MARTINA,
          description: 'Alquiler',
        }),
      ],
    });
  });

  it('una cuota de un mes futuro abre el detalle de su gasto', async () => {
    const view = await renderWithTheme(<SpaceMonthScreen spaceId="casa" monthParam="2026-11" inTabs />);

    await fireEvent.press(view.getByRole('button', { name: /Heladera/ }));

    expect(mockPush).toHaveBeenCalledWith('/space/casa/gasto/g-futuro');
  });

  it('un fijo de un mes futuro abre el fijo', async () => {
    const view = await renderWithTheme(<SpaceMonthScreen spaceId="casa" monthParam="2026-11" inTabs />);

    await fireEvent.press(view.getByRole('button', { name: /Alquiler/ }));

    expect(mockPush).toHaveBeenCalledWith('/space/casa/fijo/r-alquiler');
  });

  it('en el mes en curso, "Se vienen este mes" también abre el detalle', async () => {
    const view = await renderWithTheme(<SpaceMonthScreen spaceId="casa" monthParam="2026-10" inTabs />);

    await fireEvent.press(view.getByRole('button', { name: /Alquiler/ }));

    expect(mockPush).toHaveBeenCalledWith('/space/casa/fijo/r-alquiler');
  });

  it('los pagos entre ustedes siguen sin ser tocables', async () => {
    const payment = memberPayment({
      amount: 10_000,
      date: '2026-10-10',
      fromSlot: RENZO,
      toSlot: MARTINA,
    });
    mockFacts = spaceFacts({ payments: [payment] });
    const view = await renderWithTheme(<SpaceMonthScreen spaceId="casa" monthParam="2026-10" inTabs />);

    await fireEvent.press(view.getByText(paymentSentence(payment, 1, 'Martina')));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
