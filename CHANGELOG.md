# CHANGELOG

## [1.4.1] - 2026-10-06
- **Redesign Visual com Clay Design System (`DESIGN.md`):**
  - **Paleta de Cores e Canvas:** Adoção do canvas warm cream (`#fffaf0`), superfícies suaves (`#faf5e8`, `#f5f0e0`) e CTAs primários de alta firmeza (`#0a0a0a`).
  - **Cartões de Recursos Saturados:** Nova grade de 6 recursos destacando as cores de assinatura do Clay (Brand Pink `#ff4d8b`, Deep Teal `#1a3a3a`, Brand Ochre `#e8b94a`, Brand Lavender `#b8a4ed`, Brand Peach `#ffb084` e Cream Card `#f5f0e0`).
  - **Tabela de Preços & Paywall:** Plano Pro Ilimitado reformulado com o cartão Deep Teal (`#1a3a3a`) e botão contrastante invertido, e plano Free com o cartão Warm Peach.
  - **Navegação & Rodapé:** Navbar moderna cream (`#fffaf0`) com bordas hairlines (`#e5e5e5`) e rodapé quente e elegante (sem fundos escuros genéricos).
  - **Build & Testes:** 43 testes automatizados 100% aprovados e build compilado com sucesso.

## [1.4.0] - 2026-10-06
- **Blindagem de Segurança e Sistema de Autenticação Multi-Tenant (Opção 2):**
  - **Segurança HTTP & Headers (Helmet):** Ocultação do cabeçalho `X-Powered-By`, injeção de proteções anti-clickjacking (`X-Frame-Options: SAMEORIGIN`) e bloqueio de farejamento MIME (`X-Content-Type-Options: nosniff`).
  - **Restrição de CORS & DoS Protection:** Limitação de origens permitidas (localhost e domínio oficial), rate limiting geral de 120 req/min e limitação rígida do payload JSON em 1 MB.
  - **Validação Estrita de Assinatura Digital:** Bloqueio de scripts e payloads inválidos; validação de imagem Base64 (`png/jpeg/webp`) com teto de 500 KB e sanitização de nome do signatário.
  - **Autenticação Multi-Tenant com Criptografia Forte (`node:crypto`):**
    - Cadastro e login seguros com derivação de chave `scrypt` e verificação em tempo constante (`crypto.timingSafeEqual`).
    - Geração de tokens de sessão criptográficos de 32 bytes (válidos por 30 dias) com rota de logout e expiração.
    - Isolamento de propostas, perfil e assinaturas por pintor (`userId`). O Pintor A não consegue visualizar, alterar, excluir ou duplicar propostas do Pintor B.
  - **Componente de Autenticação na UI (`AuthModal`):** Modal de alta conversão para Login e Cadastro em 1 clique integrado à Navbar e ao fluxo de geração de propostas.
  - **Bateria de Testes:** 43 testes automatizados cobrindo segurança, headers, auth, multi-tenant e quotas 100% aprovados.

## [1.3.1] - 2026-10-06
- **Identidade e Naming Oficial: "Proposta do Pintor":**
  - **Unificação de Marca:** Atualização do título global, cabeçalho de navegação (Navbar), landing page de conversão, telas de carregamento e rodapé com copyright oficial.
  - **Marca d'Água Oficial:** Atualização da assinatura viral nos PDFs e no visualizador web interativo para `Proposta do Pintor • https://propostadopintor.com.br`.
  - **Suíte de Testes:** Atualização da expectativa E2E em `app.test.ts` (33 testes 100% aprovados).

## [1.3.0] - 2026-10-06
- **Monetização SaaS & Gestão de Quotas por Plano:**
  - **Motor de Quotas no Backend:** Validação estrita de limites por plano (`free`: 1 proposta total, `basic`: 4/mês, `intermediate`: 12/mês, `pro`: ilimitado). Retorno HTTP 403 `QUOTA_EXCEEDED` ao exceder o teto contratado.
  - **Paywall / Upgrade Modal:** Modal interativo de alta conversão apresentando os 3 planos pagos com âncora de preço no plano Pro Ilimitado (+R$ 12/mês para desbloquear tudo).
  - **Badge de Quota na Navbar:** Indicador visual de consumo de cota e botão direto de upgrade.
  - **Marca d'Água Dinâmica:** Inserção automática de crédito nos PDFs e visualizador web nos planos Free/Básico/Intermediário, e 100% removida para assinantes Pro.
  - **Suíte de Testes Automatizados:** 33 testes unitários e de integração E2E 100% aprovados.

## [1.2.1] - 2026-10-06
- **Sanitização Integral e Conformidade LGPD:**
  - **Exemplo Demonstrativo Seguro:** Substituição de qualquer dado residual dos documentos de referência por dados 100% fictícios (`Cliente Exemplo (Demonstração)`, sem telefone pré-carregado e com endereço genérico).
  - **Proteção no Envio do WhatsApp:** Abertura protegida no WhatsApp (`openWhatsAppLink`) que detecta números de teste ou ausentes e redireciona para a lista geral de contatos sem enviar para pessoas reais.
  - **Limpeza de Placeholders e Testes:** Remoção e substituição de qualquer número de telefone, rua ou cidade real em componentes, formulários e suítes de testes automatizados.
  - **Eliminação de Arquivos Obsoletos:** Remoção de scripts transitórios desnecessários (`src/utils/masks.js`).

## [1.2.0] - 2026-10-06
- **Melhorias Estruturais de Conversão (Etapa 2 - Web Proposal Viewer & Assinatura Digital):**
  - **Visualizador Web Interativo (`PublicProposalViewer`):** Interface limpa para o cliente final do pintor visualizar detalhes da proposta comercial em qualquer smartphone ou computador via hash routing (`#proposta=:id`).
  - **Rastreamento Automático de Acessos:** Endpoint `POST /api/proposals/:id/view` contabiliza visualizações (`viewCount`, `viewedAt`) e transiciona status para `SENT`.
  - **Assinatura Digital On-Screen em Canvas Touch/Mouse:** Permite assinar com o dedo ou mouse, armazenando a assinatura digital em imagem base64 (`POST /api/proposals/:id/approve`).
  - **Carimbo Jurídico de Aprovação:** Exibição do termo de aceite e assinatura digital na proposta aprovada.
  - **Compartilhamento Multicanal:** Link direto para a proposta interativa incorporado na mensagem do WhatsApp e botões "Ver Online" no formulário e na listagem de propostas.
  - **Testes Automatizados:** 30 testes unitários e de integração E2E 100% aprovados no Vitest.

## [1.1.0] - 2026-10-06
- **Otimizações Estratégicas de CRO e UX (Etapa 1 - Quick Wins):**
  - **Tabela de Preços Good-Better-Best:** Banner de destaque da Degustação Grátis (1 proposta sem cartão) e ancoragem agressiva no plano Pro Ilimitado (R$ 59) como "Mais Escolhido" (diferença de R$ 12/mês para eliminar todos os limites).
  - **Quick-Chips de Áreas:** Inclusão das áreas mais frequentes com 1 clique direto no formulário.
  - **Ação "✨ Exemplo Pronto":** Carga instantânea de orçamento completo com dados reais para demonstração imediata do produto.
  - **Limpeza de DDI Internacional (+55):** Sanitização inteligente no campo de telefone.
  - **Toasts de Feedback em Tempo Real:** Confirmação visual para cópia de WhatsApp, geração de PDF e gravação.
  - **Suite de Testes:** 29 testes automatizados passando (100% verde).
