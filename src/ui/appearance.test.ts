import { describe, it, expect } from 'vitest';
import {
  APPEARANCE_OPTIONS,
  appearanceHelp,
  parseAppearance,
  resolveScheme,
  statusBarStyleFor,
} from './appearance';

/**
 * La apariencia (Perfil · 10B): Automático sigue al iPhone; Claro y Oscuro lo
 * pisan. Lógica pura: el ThemeProvider solo la aplica.
 */

describe('resolveScheme · el esquema efectivo', () => {
  it('Automático sigue al sistema', () => {
    expect(resolveScheme('auto', 'dark')).toBe('dark');
    expect(resolveScheme('auto', 'light')).toBe('light');
  });

  it('Automático sin dato del sistema cae en claro', () => {
    expect(resolveScheme('auto', null)).toBe('light');
    expect(resolveScheme('auto', undefined)).toBe('light');
  });

  it('Claro y Oscuro pisan al sistema', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('dark', null)).toBe('dark');
  });
});

describe('parseAppearance · lo que se lee de AsyncStorage', () => {
  it('acepta las tres opciones', () => {
    expect(parseAppearance('auto')).toBe('auto');
    expect(parseAppearance('light')).toBe('light');
    expect(parseAppearance('dark')).toBe('dark');
  });

  it('lo ausente o corrupto vuelve a Automático', () => {
    expect(parseAppearance(null)).toBe('auto');
    expect(parseAppearance('')).toBe('auto');
    expect(parseAppearance('sepia')).toBe('auto');
  });
});

describe('statusBarStyleFor · la barra de estado sigue al tema elegido', () => {
  it('en oscuro el texto de la barra es claro, y al revés', () => {
    expect(statusBarStyleFor('dark')).toBe('light');
    expect(statusBarStyleFor('light')).toBe('dark');
  });
});

describe('APPEARANCE_OPTIONS · el orden del control', () => {
  it('Automático, Claro, Oscuro', () => {
    expect(APPEARANCE_OPTIONS.map((option) => option.label)).toEqual([
      'Automático',
      'Claro',
      'Oscuro',
    ]);
    expect(APPEARANCE_OPTIONS.map((option) => option.value)).toEqual(['auto', 'light', 'dark']);
  });
});

describe('appearanceHelp · la ayuda bajo "Apariencia"', () => {
  it('Automático explica que sigue al iPhone', () => {
    expect(appearanceHelp('auto')).toBe('Automático sigue el ajuste del iPhone.');
  });

  it('Claro y Oscuro dicen que es una elección', () => {
    expect(appearanceHelp('light')).toBe('Claro, elegido por vos.');
    expect(appearanceHelp('dark')).toBe('Oscuro, elegido por vos.');
  });
});
