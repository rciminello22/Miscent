import { Alert } from 'react-native';
import { possibleDuplicate } from '@domain/duplicates';
import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type { SharedExpense, Slot } from '@domain/types';
import { prettyLabel } from '@/features/add/categories';
import { duplicateMessage } from './duplicateCopy';

/**
 * Should 2 · §32 · antes de guardar un gasto compartido, si ya hay uno igual
 * cerca, se pregunta. Resuelve `true` para guardar igual, `false` para no.
 * Sin parecido, resuelve `true` sin preguntar nada.
 */
export function confirmIfDuplicate(args: {
  expenses: readonly SharedExpense[];
  amount: Pesos;
  date: IsoDate;
  mySlot: Slot;
  otherName: string;
}): Promise<boolean> {
  const match = possibleDuplicate(args.expenses, { amount: args.amount, date: args.date });
  if (match == null) return Promise.resolve(true);

  return new Promise((resolve) => {
    Alert.alert(
      '¿Ya está cargado?',
      duplicateMessage(match, {
        mySlot: args.mySlot,
        otherName: args.otherName,
        categoryLabel: prettyLabel,
      }),
      [
        { text: 'No guardar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Es otro, guardar', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
