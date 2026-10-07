import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProposalForm } from '../components/ProposalForm';
import { isValidPlanTier } from '../config/payments';

describe('ProposalForm client reuse improvements', () => {
  it('exibe sugestões de clientes recentes e ação para salvar cliente/imóvel reutilizáveis', () => {
    const html = renderToStaticMarkup(
      <ProposalForm
        catalog={[]}
        profile={{
          companyName: 'Pintura Pro',
          phones: ['(11) 3000-0000'],
          address: 'Rua da Empresa, 123',
        }}
        onSaved={() => undefined}
      />
    );

    expect(html).toContain('Clientes recentes');
    expect(html).toContain('Tipo de imóvel');
    expect(html).toContain('Observações');
    expect(html).toContain('Buscar cliente');
    expect(html).toContain('Salvar como cliente recente');
  });

  it('organiza a etapa de valores com resumo financeiro e condições de pagamento', () => {
    const html = renderToStaticMarkup(
      <ProposalForm
        defaultStep="pricing"
        catalog={[]}
        profile={{
          companyName: 'Pintura Pro',
          phones: ['(11) 3000-0000'],
          address: 'Rua da Empresa, 123',
        }}
        onSaved={() => undefined}
      />
    );

    expect(html).toContain('Resumo financeiro');
    expect(html).toContain('Condições de pagamento');
    expect(html).toContain('Desconto aplicado');
  });

  it('apresenta checklist final para revisão antes do envio da proposta', () => {
    const html = renderToStaticMarkup(
      <ProposalForm
        defaultStep="review"
        catalog={[]}
        profile={{
          companyName: 'Pintura Pro',
          phones: ['(11) 3000-0000'],
          address: 'Rua da Empresa, 123',
        }}
        onSaved={() => undefined}
      />
    );

    expect(html).toContain('Checklist final');
    expect(html).toContain('Cliente e imóvel');
    expect(html).toContain('Escopo e serviços');
    expect(html).toContain('Valor e condições');
  });

  it('rejeita valores de plano inválidos para impedir manipulação manual', () => {
    expect(isValidPlanTier('basic')).toBe(true);
    expect(isValidPlanTier('pro')).toBe(true);
    expect(isValidPlanTier('elite')).toBe(false);
    expect(isValidPlanTier('')).toBe(false);
    expect(isValidPlanTier(undefined)).toBe(false);
  });
});
