import { Proposal, ProviderProfile } from '../types.js';

export function generateWhatsAppMessage(proposal: Proposal, profile: ProviderProfile): string {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const lines: string[] = [];

  // Cabeçalho
  lines.push(`📄 *PROPOSTA DE PINTURA RESIDENCIAL*`);
  lines.push(`*${profile.companyName || 'Pinturas & Reformas'}*`);
  if (profile.phones.length > 0) {
    lines.push(`📞 Contato: ${profile.phones.join(' / ')}`);
  }
  lines.push(`───────────────`);

  // Identificação do Cliente
  lines.push(`👤 *Cliente:* ${proposal.client.name}`);
  if (proposal.client.address) {
    lines.push(`📍 *Obra:* ${proposal.client.address}${proposal.client.city ? ` - ${proposal.client.city}` : ''}`);
  }
  lines.push(`📋 *Proposta:* ${proposal.proposalNumber}`);
  lines.push(`───────────────`);

  // Áreas e Escopo
  lines.push(`🛠️ *ÁREAS E SERVIÇOS INCLUSOS:*`);
  proposal.areas.forEach((area, index) => {
    lines.push(`\n*${index + 1}. ${area.areaName}*`);
    area.steps.forEach((step) => {
      lines.push(`  • ${step}`);
    });
  });

  lines.push(`\n───────────────`);

  // Valores
  const tipoValor = proposal.terms.includesMaterials 
    ? 'VALOR DE MÃO DE OBRA + MATERIAL' 
    : 'VALOR DE MÃO DE OBRA';

  lines.push(`💰 *${tipoValor}:*`);
  lines.push(`*${formatBRL(proposal.pricing.netAmount)}*`);

  if (!proposal.terms.includesMaterials) {
    lines.push(`_(Materiais por conta do contratante)_`);
  }

  // Condições de Pagamento e Validade
  lines.push(`\n💳 *Forma de Pagamento:* ${proposal.terms.paymentCondition}`);
  if (proposal.terms.withInvoice) {
    lines.push(`📝 *Nota Fiscal:* Inclusa`);
  } else {
    lines.push(`📝 *Obs:* Sem NF`);
  }
  lines.push(`⏳ *Validade da Proposta:* ${proposal.terms.validityDays} dias`);

  if (profile.pixKey) {
    lines.push(`🔑 *Chave PIX:* ${profile.pixKey}`);
  }

  if (typeof window !== 'undefined' && proposal.publicToken) {
    const proposalUrl = `${window.location.origin}/#proposta=${proposal.publicToken}`;
    lines.push(`\n🔗 *Acesse os detalhes online e aprove com 1 clique:*`);
    lines.push(proposalUrl);
  }

  lines.push(`───────────────`);
  lines.push(`Aguardamos seu retorno para agendamento!`);

  return lines.join('\n');
}

export function openWhatsAppLink(phone: string | undefined, message: string): void {
  const encoded = encodeURIComponent(message);
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('55') && cleanPhone.length > 11) {
    cleanPhone = cleanPhone.slice(2);
  }

  // Verifica se o número é fictício (ex: todos dígitos iguais como 00000000000) ou inválido
  const isDummy = /^(\d)\1+$/.test(cleanPhone) || cleanPhone.length < 10 || cleanPhone.length > 11;

  const url = (!isDummy && cleanPhone)
    ? `https://wa.me/55${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}
