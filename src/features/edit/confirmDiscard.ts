import { Alert } from 'react-native';

/**
 * UX-18 · "Cancelar" con cambios sin guardar pregunta antes de tirarlos, igual
 * que Agregar con "¿Descartar este gasto?" (§17). Es una confirmación con
 * botones, no un aviso (UX-23).
 */
export function confirmDiscardChanges(onDiscard: () => void) {
  Alert.alert('¿Descartar los cambios?', 'Lo que cambiaste no se va a guardar.', [
    { text: 'Seguir editando', style: 'cancel' },
    { text: 'Descartar', style: 'destructive', onPress: onDiscard },
  ]);
}
