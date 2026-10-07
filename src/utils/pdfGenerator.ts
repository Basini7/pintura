import { jsPDF } from 'jspdf';
import { Proposal, ProviderProfile } from '../types.js';

type ProposalDocumentData = Pick<Proposal, 'proposalNumber' | 'createdAt' | 'client' | 'areas' | 'pricing' | 'terms' | 'status' | 'approvedAt' | 'signerName'>;

export function generateProposalPDF(proposal: ProposalDocumentData, profile: ProviderProfile, hasWatermark: boolean = true): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (isoString?: string) => {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // --- CABEÇALHO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(26, 54, 93); // Azul escuro corporativo
  doc.text(profile.companyName || 'PROPOSTA DE PINTURA', pageWidth / 2, y, { align: 'center' });
  y += 7;

  if (profile.phones && profile.phones.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(`Fone: ${profile.phones.join(' / ')}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
  } else {
    y += 5;
  }

  // Título da Proposta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(185, 28, 28); // Vermelho escuro clássico
  doc.text('PROPOSTA DE PINTURA RESIDENCIAL', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Data e Local
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  const localDate = `${proposal.client.city ? `${proposal.client.city}, ` : ''}${formatDate(proposal.createdAt)}`;
  doc.text(localDate, margin, y);
  y += 6;

  // Identificação do Cliente e Obra
  doc.setFont('helvetica', 'bold');
  doc.text(`Para: ${proposal.client.name}`, margin, y);
  y += 5;

  if (proposal.client.address) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Obra: ${proposal.client.address}`, margin, y);
    y += 7;
  }

  // Linha divisória
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- RESUMO DAS ÁREAS DE PINTURA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('ÁREAS DE PINTURA:', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  proposal.areas.forEach((area) => {
    doc.text(`• ${area.areaName}`, margin + 3, y);
    y += 5;
  });
  y += 5;

  // Linha divisória
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- DETALHAMENTO DO ESCOPO DE SERVIÇOS ---
  // Separação por categorias
  const areasInternas = proposal.areas.filter((a) => a.category === 'ALVENARIA_INTERNA');
  const areasExternas = proposal.areas.filter((a) => a.category === 'ALVENARIA_EXTERNA');
  const outrasAreas = proposal.areas.filter(
    (a) => a.category === 'MADEIRAMENTOS' || a.category === 'METALICOS'
  );

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }
  };

  const renderAreaBlock = (sectionTitle: string, list: typeof proposal.areas) => {
    if (list.length === 0) return;

    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(sectionTitle.toUpperCase(), margin, y);
    y += 7;

    list.forEach((area, idx) => {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(185, 28, 28);
      doc.text(`ETAPA ${idx + 1} – ${area.areaName.toUpperCase()}`, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);

      area.steps.forEach((step) => {
        checkPageBreak(8);
        const splitText = doc.splitTextToSize(`• ${step}`, contentWidth - 6);
        doc.text(splitText, margin + 4, y);
        y += splitText.length * 4.5 + 1;
      });
      y += 3;
    });
  };

  renderAreaBlock('ESCOPO DOS SERVIÇOS INTERNOS', areasInternas);
  renderAreaBlock('ESCOPO DOS SERVIÇOS EXTERNOS', areasExternas);
  renderAreaBlock('ESCOPO DE MADEIRAMENTOS E METÁLICOS', outrasAreas);

  // --- QUADRO FINANCEIRO E CONDIÇÕES ---
  checkPageBreak(35);
  y += 4;
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Caixa de Valor
  const tipoValor = proposal.terms.includesMaterials
    ? 'VALOR DE MÃO DE OBRA + MATERIAL'
    : 'VALOR DE MÃO DE OBRA';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(`${tipoValor} -----------------------------------`, margin, y);
  doc.text(formatBRL(proposal.pricing.netAmount), pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Forma de pagamento
  doc.setFont('helvetica', 'bold');
  doc.text('FORMA DE PAGAMENTO', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(proposal.terms.paymentCondition || 'A combinar entre as partes.', margin, y);
  y += 6;

  // Observações e Validade
  if (!proposal.terms.withInvoice) {
    doc.text('Obs: Sem NF', margin, y);
    y += 5;
  }
  if (!proposal.terms.includesMaterials) {
    doc.text('Obs: Fornecimento de materiais por conta do contratante.', margin, y);
    y += 5;
  }
  doc.text(`Validade da proposta: ${proposal.terms.validityDays} dias`, margin, y);

  // --- RODAPÉ EM TODAS AS PÁGINAS ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);

    const footerText = [
      profile.address || '',
      profile.phones.length > 0 ? `Fone: ${profile.phones.join(' / ')}` : '',
    ]
      .filter(Boolean)
      .join(' — ');

    if (footerText) {
      doc.text(footerText, pageWidth / 2, pageHeight - 11, { align: 'center' });
    }
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 11, { align: 'right' });

    if (hasWatermark) {
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text('Elaborado via Proposta do Pintor • https://propostadopintor.com.br', margin, pageHeight - 11);
    }
  }

  // Nome do arquivo seguro
  const cleanName = (proposal.client.name || 'Proposta')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  doc.save(`Proposta_Pintura_${cleanName}.pdf`);
}
