import { describe, it, expect } from 'vitest';
import { 
  calculatePricingSummary, 
  formatBRL, 
  generatePaymentSchedule 
} from '../utils/pricingEngine.js';
import { SelectedAreaScope } from '../types/domain.js';

describe('Motor Financeiro e Precificação Híbrida (TASK-003)', () => {
  const mockAreas: SelectedAreaScope[] = [
    { areaId: 'fachada_externa', areaName: 'Fachada', category: 'ALVENARIA_EXTERNA', steps: [], price: 20000 },
    { areaId: 'muros', areaName: 'Muros', category: 'ALVENARIA_EXTERNA', steps: [], price: 8000 },
    { areaId: 'portas', areaName: 'Portas', category: 'MADEIRAMENTOS', steps: [], price: 4000 },
  ];

  it('deve calcular corretamente pelo modo BY_AREA somando os itens', () => {
    const res = calculatePricingSummary({
      mode: 'BY_AREA',
      areas: mockAreas,
    });

    expect(res.mode).toBe('BY_AREA');
    expect(res.totalAmount).toBe(32000);
    expect(res.discount).toBe(0);
    expect(res.netAmount).toBe(32000);
  });

  it('deve calcular corretamente pelo modo GLOBAL fechado ignorando valores por item', () => {
    const res = calculatePricingSummary({
      mode: 'GLOBAL',
      areas: mockAreas,
      globalAmount: 77500,
    });

    expect(res.mode).toBe('GLOBAL');
    expect(res.totalAmount).toBe(77500);
    expect(res.netAmount).toBe(77500);
  });

  it('deve aplicar desconto percentual corretamente', () => {
    const res = calculatePricingSummary({
      mode: 'GLOBAL',
      areas: [],
      globalAmount: 10000,
      discountPercent: 10,
    });

    expect(res.totalAmount).toBe(10000);
    expect(res.discount).toBe(1000);
    expect(res.netAmount).toBe(9000);
  });

  it('deve aplicar desconto nominal fixo respeitando limite do total', () => {
    const res = calculatePricingSummary({
      mode: 'GLOBAL',
      areas: [],
      globalAmount: 5000,
      discountNominal: 500,
    });

    expect(res.discount).toBe(500);
    expect(res.netAmount).toBe(4500);
  });

  it('deve formatar valores para moeda brasileira BRL', () => {
    const formatted = formatBRL(32000);
    expect(formatted).toContain('32.000,00');
    expect(formatted).toContain('R$');
  });

  it('deve gerar cronograma de 30% / 40% / 30%', () => {
    const schedule = generatePaymentSchedule(10000, '30% entrada + 40% meio + 30% entrega');
    expect(schedule).toHaveLength(3);
    expect(schedule[0].amount).toBe(3000);
    expect(schedule[1].amount).toBe(4000);
    expect(schedule[2].amount).toBe(3000);
    expect(schedule.reduce((acc, p) => acc + p.amount, 0)).toBe(10000);
  });

  it('deve gerar cronograma quinzenal', () => {
    const schedule = generatePaymentSchedule(32000, 'A cada duas semanas');
    expect(schedule).toHaveLength(2);
    expect(schedule[0].amount).toBe(16000);
    expect(schedule[1].amount).toBe(16000);
  });
});
