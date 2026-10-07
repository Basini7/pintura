import { SubstrateCategory, WorkAreaConfig, SelectedAreaScope } from '../types/domain.js';

export const WORK_AREAS_CATALOG: WorkAreaConfig[] = [
  // --- ALVENARIA INTERNA ---
  {
    id: 'paredes',
    name: 'Paredes',
    category: 'ALVENARIA_INTERNA',
    defaultSteps: [
      { id: 'pi-1', order: 1, description: 'Forração e proteção dos pisos, móveis e áreas não pintáveis com lona e/ou papelão' },
      { id: 'pi-2', order: 2, description: 'Lixamento geral de aderência e limpeza da poeira' },
      { id: 'pi-3', order: 3, description: 'Aplicação de seladora para alvenaria/gesso' },
      { id: 'pi-4', order: 4, description: 'Pequenas correções de imperfeições com massa corrida' },
      { id: 'pi-5', order: 5, description: 'Lixamento para regularização da superfície' },
      { id: 'pi-6', order: 6, description: 'Pintura com 02 a 03 demãos de tinta acrílica/látex na cor escolhida' },
    ],
  },
  {
    id: 'tetos',
    name: 'Tetos',
    category: 'ALVENARIA_INTERNA',
    defaultSteps: [
      { id: 'ti-1', order: 1, description: 'Forração e proteção dos pisos e áreas não pintáveis com lona e/ou papelão' },
      { id: 'ti-2', order: 2, description: 'Aplicação de seladora para gesso/alvenaria' },
      { id: 'ti-3', order: 3, description: 'Aplicação de 02 demãos de massa corrida para nivelamento' },
      { id: 'ti-4', order: 4, description: 'Lixamento técnico para regularização da superfície' },
      { id: 'ti-5', order: 5, description: 'Aplicação de 02 demãos de tinta látex PVA/acrílica na cor escolhida' },
    ],
  },

  // --- ALVENARIA EXTERNA ---
  {
    id: 'fachada_externa',
    name: 'Fachada Externa',
    category: 'ALVENARIA_EXTERNA',
    supportedVariations: {
      cleaning: ['Limpeza simples', 'Hidrojateamento'],
      finish: ['Pintura Acrílica', 'Textura Cristal', 'Textura Granfino Hidro-repelente', 'Outra'],
      hasBurnedCementTreatment: true,
    },
    defaultSteps: [
      { id: 'fe-1', order: 1, description: 'Forração e proteção dos pisos e objetos não pintáveis com lona e/ou papelão' },
      { id: 'fe-2', order: 2, description: 'Lavagem através de hidrojateamento de alta pressão e remoção de revestimento solto' },
      { id: 'fe-3', order: 3, description: 'Aplicação de uma demão de Fundo Preparador de Paredes aglutinador de partículas soltas' },
      { id: 'fe-4', order: 4, description: 'Aplicação de 02 demãos de Selador Acrílico na cor de fundo' },
      { id: 'fe-5', order: 5, description: 'Aplicação de acabamento com textura hidro-repelente tipo Granfino na cor escolhida' },
    ],
  },
  {
    id: 'muros',
    name: 'Muros',
    category: 'ALVENARIA_EXTERNA',
    supportedVariations: {
      cleaning: ['Limpeza simples', 'Hidrojateamento'],
      finish: ['Pintura Acrílica', 'Textura Cristal', 'Textura Granfino Hidro-repelente', 'Outra'],
      hasBurnedCementTreatment: false,
    },
    defaultSteps: [
      { id: 'mu-1', order: 1, description: 'Forração e proteção das áreas adjacentes não pintáveis' },
      { id: 'mu-2', order: 2, description: 'Limpeza completa das superfícies e correção de trincas/imperfeições' },
      { id: 'mu-3', order: 3, description: 'Aplicação de Fundo Preparador de Paredes' },
      { id: 'mu-4', order: 4, description: 'Aplicação de 02 demãos de Seladora Acrílica' },
      { id: 'mu-5', order: 5, description: 'Aplicação de textura acrílica tipo rolada na cor desejada' },
    ],
  },

  // --- MADEIRAMENTOS ---
  {
    id: 'portas',
    name: 'Portas e Batentes',
    category: 'MADEIRAMENTOS',
    supportedVariations: {
      woodFinish: ['Verniz', 'Esmalte Sintético'],
    },
    defaultSteps: [
      { id: 'po-1', order: 1, description: 'Lixamento técnico e limpeza das superfícies das portas e batentes' },
      { id: 'po-2', order: 2, description: 'Correção de imperfeições com massa própria para madeira' },
      { id: 'po-3', order: 3, description: 'Pintura com Tinta Esmalte na cor e acabamento desejados' },
    ],
  },
  {
    id: 'forros_madeira',
    name: 'Forros de Madeira',
    category: 'MADEIRAMENTOS',
    supportedVariations: {
      woodFinish: ['Verniz', 'Esmalte Sintético'],
    },
    defaultSteps: [
      { id: 'fm-1', order: 1, description: 'Lixamento e limpeza técnica dos forros de madeira' },
      { id: 'fm-2', order: 2, description: 'Correção de pequenas imperfeições' },
      { id: 'fm-3', order: 3, description: 'Aplicação de Verniz protetor na tonalidade escolhida' },
    ],
  },
  {
    id: 'testeiras',
    name: 'Testeiras',
    category: 'MADEIRAMENTOS',
    supportedVariations: {
      woodFinish: ['Verniz', 'Esmalte Sintético'],
    },
    defaultSteps: [
      { id: 'te-1', order: 1, description: 'Lixamento e limpeza das testeiras de madeira' },
      { id: 'te-2', order: 2, description: 'Correção de imperfeições da madeira' },
      { id: 'te-3', order: 3, description: 'Aplicação de Verniz ou Esmalte Sintético resistente a intempéries' },
    ],
  },

  // --- METÁLICOS ---
  {
    id: 'rufos',
    name: 'Rufos',
    category: 'METALICOS',
    defaultSteps: [
      { id: 'rf-1', order: 1, description: 'Lixamento e remoção de impurezas dos rufos metálicos' },
      { id: 'rf-2', order: 2, description: 'Aplicação de Convertedor de Ferrugem nos pontos necessários' },
      { id: 'rf-3', order: 3, description: 'Aplicação de Fundo Sintético anticorrosivo' },
      { id: 'rf-4', order: 4, description: 'Pintura com Tinta Esmalte Sintético na cor desejada' },
    ],
  },
  {
    id: 'calhas',
    name: 'Calhas e Pingadeiras',
    category: 'METALICOS',
    defaultSteps: [
      { id: 'cl-1', order: 1, description: 'Lixamento e limpeza das calhas e pingadeiras' },
      { id: 'cl-2', order: 2, description: 'Aplicação de Convertedor de Ferrugem onde necessário' },
      { id: 'cl-3', order: 3, description: 'Aplicação de Fundo Sintético protetor' },
      { id: 'cl-4', order: 4, description: 'Pintura com Tinta Esmalte Sintético na cor desejada' },
    ],
  },
  {
    id: 'grades',
    name: 'Grades',
    category: 'METALICOS',
    defaultSteps: [
      { id: 'gr-1', order: 1, description: 'Lixamento manual/mecânico das grades de ferro' },
      { id: 'gr-2', order: 2, description: 'Aplicação de Convertedor de Ferrugem nos pontos de corrosão' },
      { id: 'gr-3', order: 3, description: 'Aplicação de Fundo Sintético antiferrugem' },
      { id: 'gr-4', order: 4, description: 'Pintura com Tinta Esmalte Sintético de alta resistência' },
    ],
  },
  {
    id: 'portao',
    name: 'Portão Metálico',
    category: 'METALICOS',
    defaultSteps: [
      { id: 'pt-1', order: 1, description: 'Lixamento completo e limpeza do portão' },
      { id: 'pt-2', order: 2, description: 'Aplicação de Convertedor de Ferrugem onde for necessário' },
      { id: 'pt-3', order: 3, description: 'Aplicação de Fundo Sintético' },
      { id: 'pt-4', order: 4, description: 'Pintura com Tinta Esmalte Sintético na cor escolhida' },
    ],
  },
];

export interface ResolveScopeOptions {
  cleaningMethod?: 'Limpeza simples' | 'Hidrojateamento';
  finishType?: 'Pintura Acrílica' | 'Textura Cristal' | 'Textura Granfino Hidro-repelente' | 'Outra';
  customFinishText?: string;
  woodFinishType?: 'Verniz' | 'Esmalte Sintético';
  includeBurnedCement?: boolean;
  price?: number;
}

export function getWorkAreaConfig(areaId: string): WorkAreaConfig | undefined {
  return WORK_AREAS_CATALOG.find((area) => area.id === areaId);
}

export function buildScopeForArea(areaId: string, options?: ResolveScopeOptions): SelectedAreaScope {
  const config = getWorkAreaConfig(areaId);
  if (!config) {
    throw new Error(`Área de trabalho desconhecida: "${areaId}"`);
  }

  const steps: string[] = [];

  if (config.category === 'ALVENARIA_EXTERNA') {
    steps.push('Forração e proteção dos pisos e objetos não pintáveis com lona e/ou papelão');
    
    // Limpeza ou hidrojateamento
    if (options?.cleaningMethod === 'Limpeza simples') {
      steps.push('Limpeza completa das superfícies e remoção de partículas desagregadas');
    } else {
      steps.push('Lavagem através de hidrojateamento de alta pressão e remoção de revestimento solto');
    }

    steps.push('Aplicação de uma demão de Fundo Preparador de Paredes aglutinador de partículas soltas');
    steps.push('Aplicação de 02 demãos de Selador Acrílico');

    // Acabamento
    if (options?.finishType === 'Pintura Acrílica') {
      steps.push('Pintura com 02 a 03 demãos de Tinta Acrílica Premium na cor escolhida');
    } else if (options?.finishType === 'Textura Cristal') {
      steps.push('Aplicação de Textura Acrílica tipo Cristal na cor desejada');
    } else if (options?.finishType === 'Textura Granfino Hidro-repelente') {
      steps.push('Aplicação de Textura Hidro-repelente tipo Granfino na cor escolhida');
    } else if (options?.finishType === 'Outra' && options.customFinishText) {
      steps.push(`Aplicação de revestimento: ${options.customFinishText}`);
    } else {
      // Padrão da área
      const defaultFinish = config.defaultSteps.find((s) => s.id.endsWith('-5'))?.description;
      if (defaultFinish) steps.push(defaultFinish);
    }

    // Opcional cimento queimado
    if (options?.includeBurnedCement) {
      steps.push('Tratamento e revitalização de todo Cimento Queimado através de lixamento e aplicação de Hidrofugante');
    }
  } else if (config.category === 'MADEIRAMENTOS') {
    steps.push('Lixamento técnico e limpeza das superfícies de madeira');
    steps.push('Correção de pequenas imperfeições com massa própria para madeira');

    if (options?.woodFinishType === 'Verniz') {
      steps.push('Aplicação de Verniz protetor na cor e brilho desejados');
    } else if (options?.woodFinishType === 'Esmalte Sintético') {
      steps.push('Pintura de acabamento com Tinta Esmalte Sintético na cor desejada');
    } else {
      const defaultFinish = config.defaultSteps[2]?.description;
      if (defaultFinish) steps.push(defaultFinish);
    }
  } else {
    // Alvenaria Interna e Metálicos seguem suas etapas padrão diretamente
    config.defaultSteps.forEach((s) => steps.push(s.description));
  }

  return {
    areaId: config.id,
    areaName: config.name,
    category: config.category,
    steps,
    optionsSelected: options,
    price: options?.price,
  };
}
