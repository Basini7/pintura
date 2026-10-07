import { describe, it, expect } from 'vitest';
import { maskPhone } from '../utils/masks.js';

describe('Máscara de Telefone Brasileiro (maskPhone)', () => {
  it('deve formatar celular com 11 dígitos no padrão (99) 99999-9999', () => {
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888');
    expect(maskPhone('21988887777')).toBe('(21) 98888-7777');
  });

  it('deve formatar telefone fixo com 10 dígitos no padrão (99) 9999-9999', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('deve limpar DDI brasileiro (+55) ao colar número internacional', () => {
    expect(maskPhone('+5521988887777')).toBe('(21) 98888-7777');
    expect(maskPhone('5511977776666')).toBe('(11) 97777-6666');
  });

  it('deve lidar com entradas incompletas durante a digitação', () => {
    expect(maskPhone('1')).toBe('(1');
    expect(maskPhone('11')).toBe('(11');
    expect(maskPhone('119')).toBe('(11) 9');
    expect(maskPhone('119999')).toBe('(11) 9999');
  });

  it('deve remover caracteres não numéricos e limitar a 11 dígitos', () => {
    expect(maskPhone('abc11xyz98888-777799999')).toBe('(11) 98888-7777');
  });

  it('deve retornar string vazia para valor vazio', () => {
    expect(maskPhone('')).toBe('');
  });
});
