import { PricingMode, PricingSummary, SelectedAreaScope } from '../types/domain.js';

export interface PricingInput {
  mode: PricingMode;
  areas: SelectedAreaScope[];
  globalAmount?: number;
  discountNominal?: number;
  discountPercent?: number;
}

export interface PaymentInstallment {
  description: string;
  amount: number;
  percentage: number;
}

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (R$ 1.234,56).
 */
export function formatBRL(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Calcula o resumo de preços de acordo com o modo escolhido (GLOBAL ou BY_AREA).
 */
export function calculatePricingSummary(input: PricingInput): PricingSummary {
  let totalAmount = 0;

  if (input.mode === 'BY_AREA') {
    totalAmount = input.areas.reduce((sum, item) => sum + (item.price || 0), 0);
  } else {
    totalAmount = Math.max(0, input.globalAmount || 0);
  }

  let discount = 0;
  if (input.discountPercent && input.discountPercent > 0) {
    const rate = Math.min(100, input.discountPercent) / 100;
    discount = Math.round(totalAmount * rate * 100) / 100;
  } else if (input.discountNominal && input.discountNominal > 0) {
    discount = Math.min(totalAmount, input.discountNominal);
  }

  const netAmount = Math.max(0, Math.round((totalAmount - discount) * 100) / 100);

  return {
    mode: input.mode,
    totalAmount: Math.round(totalAmount * 100) / 100,
    discount,
    netAmount,
  };
}

/**
 * Gera as parcelas recomendadas ou decomposição com base na condição de pagamento.
 */
export function generatePaymentSchedule(netAmount: number, conditionType: string): PaymentInstallment[] {
  if (netAmount <= 0) return [];

  if (conditionType.includes('30%') && conditionType.includes('40%')) {
    // Padrão 30% Entrada + 40% Meio + 30% Entrega
    const entrada = Math.round(netAmount * 0.3 * 100) / 100;
    const meio = Math.round(netAmount * 0.4 * 100) / 100;
    const entrega = Math.round((netAmount - entrada - meio) * 100) / 100;

    return [
      { description: 'Entrada (Início da Obra)', amount: entrada, percentage: 30 },
      { description: 'Intermediária (Meio da Obra)', amount: meio, percentage: 40 },
      { description: 'Final (Entrega dos Serviços)', amount: entrega, percentage: 30 },
    ];
  }

  if (conditionType.toLowerCase().includes('quinzenal') || conditionType.toLowerCase().includes('duas semanas')) {
    // Padrão quinzenal (estimativa base em 2 quinzenas)
    const parcela1 = Math.round(netAmount * 0.5 * 100) / 100;
    const parcela2 = Math.round((netAmount - parcela1) * 100) / 100;

    return [
      { description: '1ª Quinzena (Quinta-feira)', amount: parcela1, percentage: 50 },
      { description: '2ª Quinzena (Quinta-feira / Conclusão)', amount: parcela2, percentage: 50 },
    ];
  }

  // Condição única / À vista / A combinar
  return [
    { description: conditionType || 'Valor Total a Combinar', amount: netAmount, percentage: 100 }
  ];
}
