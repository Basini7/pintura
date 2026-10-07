import { describe, it, expect } from 'vitest';
import { 
  WORK_AREAS_CATALOG, 
  buildScopeForArea, 
  getWorkAreaConfig 
} from '../catalog/scopeCatalog.js';

describe('Catálogo de Escopos e Áreas de Trabalho (3 Níveis)', () => {
  it('deve conter as 11 áreas de trabalho mapeadas para os 4 substratos', () => {
    expect(WORK_AREAS_CATALOG).toHaveLength(11);

    const categories = new Set(WORK_AREAS_CATALOG.map((a) => a.category));
    expect(categories.has('ALVENARIA_INTERNA')).toBe(true);
    expect(categories.has('ALVENARIA_EXTERNA')).toBe(true);
    expect(categories.has('MADEIRAMENTOS')).toBe(true);
    expect(categories.has('METALICOS')).toBe(true);
  });

  it('deve herdar processo de Alvenaria Interna para Paredes e Tetos', () => {
    const paredes = buildScopeForArea('paredes');
    expect(paredes.category).toBe('ALVENARIA_INTERNA');
    expect(paredes.steps.some((s) => s.includes('massa corrida'))).toBe(true);
    expect(paredes.steps.some((s) => s.includes('seladora'))).toBe(true);

    const tetos = buildScopeForArea('tetos');
    expect(tetos.category).toBe('ALVENARIA_INTERNA');
    expect(tetos.steps.some((s) => s.includes('02 demãos de massa corrida'))).toBe(true);
  });

  it('deve resolver Alvenaria Externa (Fachada) com variações de hidrojateamento e acabamento', () => {
    const escopoCristal = buildScopeForArea('fachada_externa', {
      cleaningMethod: 'Hidrojateamento',
      finishType: 'Textura Cristal',
      includeBurnedCement: true,
    });

    expect(escopoCristal.category).toBe('ALVENARIA_EXTERNA');
    expect(escopoCristal.steps.some((s) => s.includes('hidrojateamento'))).toBe(true);
    expect(escopoCristal.steps.some((s) => s.includes('Textura Acrílica tipo Cristal'))).toBe(true);
    expect(escopoCristal.steps.some((s) => s.includes('Cimento Queimado'))).toBe(true);
  });

  it('deve permitir acabamento customizado "Outra" na Fachada Externa', () => {
    const escopoCustom = buildScopeForArea('fachada_externa', {
      cleaningMethod: 'Limpeza simples',
      finishType: 'Outra',
      customFinishText: 'Micro revestimento Artcollor',
    });

    expect(escopoCustom.steps.some((s) => s.includes('Micro revestimento Artcollor'))).toBe(true);
  });

  it('deve resolver Madeiramentos (Portas) com opção Verniz ou Esmalte', () => {
    const portaVerniz = buildScopeForArea('portas', { woodFinishType: 'Verniz' });
    expect(portaVerniz.category).toBe('MADEIRAMENTOS');
    expect(portaVerniz.steps.some((s) => s.includes('Verniz'))).toBe(true);

    const portaEsmalte = buildScopeForArea('portas', { woodFinishType: 'Esmalte Sintético' });
    expect(portaEsmalte.steps.some((s) => s.includes('Esmalte Sintético'))).toBe(true);
  });

  it('deve resolver Metálicos (Rufos, Calhas, Portão) com convertedor de ferrugem e fundo sintético', () => {
    const portao = buildScopeForArea('portao');
    expect(portao.category).toBe('METALICOS');
    expect(portao.steps.some((s) => s.includes('Convertedor de Ferrugem'))).toBe(true);
    expect(portao.steps.some((s) => s.includes('Fundo Sintético'))).toBe(true);
    expect(portao.steps.some((s) => s.includes('Esmalte Sintético'))).toBe(true);
  });

  it('deve lançar erro se área informada não existir', () => {
    expect(() => buildScopeForArea('area_inexistente')).toThrowError('Área de trabalho desconhecida');
  });
});
