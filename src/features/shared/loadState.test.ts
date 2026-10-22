import { describe, expect, it } from 'vitest';
import { loadState } from './loadState';

describe('loadState · H-03, un error nunca se muestra como vacío', () => {
  it('cargando: sin datos y buscando', () => {
    expect(loadState({ data: undefined, status: 'pending', fetchStatus: 'fetching' })).toBe('loading');
  });

  it('una lista vacía DE VERDAD es un dato: se muestra el vacío', () => {
    expect(loadState({ data: [], status: 'success', fetchStatus: 'idle' })).toBe('ready');
  });

  it('falló la lectura y no hay nada: error, no vacío', () => {
    expect(loadState({ data: undefined, status: 'error', fetchStatus: 'idle' })).toBe('error');
  });

  it('sin conexión (en pausa) no queda cargando para siempre', () => {
    expect(loadState({ data: undefined, status: 'pending', fetchStatus: 'paused' })).toBe('error');
  });

  it('al reintentar vuelve a cargar, y con datos se recupera', () => {
    expect(loadState({ data: undefined, status: 'error', fetchStatus: 'fetching' })).toBe('loading');
    expect(loadState({ data: { ok: true }, status: 'success', fetchStatus: 'idle' })).toBe('ready');
  });

  it('si falla una actualización de fondo, lo último leído sigue valiendo', () => {
    expect(loadState({ data: { ok: true }, status: 'error', fetchStatus: 'idle' })).toBe('ready');
  });
});
