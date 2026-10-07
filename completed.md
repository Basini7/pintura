# COMPLETED TASKS

### [CRO-001] Etapa 1: Quick Wins de Conversão, UX & Ancoragem de Preços
- **Status:** CONCLUÍDO E APROVADO PELO AGENT_QA
- **Data:** 2026-10-06
- **Entregáveis:**
  - **Sanitização de Telefone com Limpeza de DDI (+55):** Aceita colagem com código internacional limpando automaticamente e formatando nos 11 dígitos locais com máscara.
  - **Quick-Chips de Áreas Frequentes:** 6 botões no topo da seção de escopo (`Fachada Externa`, `Paredes`, `Muros`, `Portas`, `Tetos`, `Calhas & Rufos`) para adicionar processos em 1 clique sem abrir modal.
  - **Botão "✨ Exemplo Pronto":** Preenche instantaneamente uma proposta real de visita técnica com cliente, endereço, duas áreas e valores para entrega imediata do *Aha! Moment*.
  - **Toast Flutuante de Confirmação:** Feedback visual de cópia para WhatsApp, download de PDF e salvamento.
  - **Nova Tabela de Preços (Good-Better-Best):** Banner desacoplado do Free Tier ("Degustação Grátis") no topo e grade com 3 planos limpos, destacando o plano **Pro Ilimitado (R$ 59)** com âncora matemática explícita de R$ 0,40/dia (+R$ 12 sobre o intermediário).
  - **Bateria de Testes:** 29 testes automatizados passando (100% verde).

### [CRO-002] Etapa 2: Melhorias Estruturais de Conversão (Web Proposal Viewer & Assinatura Digital)
- **Status:** CONCLUÍDO E APROVADO PELO AGENT_QA
- **Data:** 2026-10-06
- **Entregáveis:**
  - **Visualizador Web Interativo (`PublicProposalViewer`):** Página web pública e responsiva para o cliente final do pintor visualizar a proposta com cabeçalho corporativo, detalhes da obra, escopo técnico discriminado por áreas e resumo financeiro.
  - **Rastreamento Automático de Visualizações (`viewCount`, `viewedAt`):** Endpoint `POST /api/proposals/:id/view` disparado automaticamente ao carregar a página da proposta, registrando contador de acessos e mudando status de `DRAFT` para `SENT`.
  - **Assinatura Digital Integrada no Canvas Touch/Mouse:** Modal para o cliente desenhar sua assinatura digital direto no celular ou computador, com validação de nome do signatário e armazenamento de imagem base64 (`POST /api/proposals/:id/approve`).
  - **Selo de Validade Jurídica & Estado de Aceite:** Proposta aprovada exibe carimbo de aceite digital com data, signatário e imagem da assinatura.
  - **Integração WhatsApp + Hash Routing:** Mensagem gerada para WhatsApp agora inclui link direto para a proposta interativa (`#proposta=id`).
  - **Bateria de Testes:** 30 testes automatizados passando (100% verde).

### [CRO-003] Etapa 3: Gestão de Quotas SaaS, Paywall Modal & Marca d'Água Condicional
- **Status:** CONCLUÍDO E APROVADO PELO AGENT_QA
- **Data:** 2026-10-06
- **Entregáveis:**
  - **Motor de Quotas no Backend (`checkQuota`):** Bloqueio estrito no Free Tier após 1 proposta gratuita (com retorno HTTP 403 `QUOTA_EXCEEDED`). Suporte a ciclo mensal com cotas de 4 propostas (Básico), 12 (Intermediário) e Ilimitado (Pro).
  - **Paywall / Modal de Upgrade de Alta Conversão (`UpgradeModal`):** Apresenta comparativo Good-Better-Best, destaca o plano Pro Ilimitado (R$ 59) com âncora matemática de R$ 0,40/dia (+R$ 12 sobre o intermediário), e permite ativação/upgrade instantâneo com um clique.
  - **Badge de Quota na Navbar:** Exibe consumo do plano em tempo real no topo da aplicação com botão de Upgrade direto.
  - **Marca d'Água Condicional:** Exibição elegante no rodapé do PDF e do visualizador público nos planos Free/Básico/Intermediário, e 100% removida no plano Pro.
  - **Bateria de Testes:** 33 testes automatizados passando (100% verde).

### [CRO-004] Etapa 4: Blindagem de Segurança & Autenticação Multi-Tenant (Opção 2)
- **Status:** CONCLUÍDO E APROVADO PELO AGENT_QA
- **Data:** 2026-10-06
- **Entregáveis:**
  - **Blindagem HTTP (`helmet`):** Proteção contra clickjacking (`X-Frame-Options`), injeção MIME (`X-Content-Type-Options`) e ocultação do Express.
  - **Defesa DoS & CORS:** Restrição a origens permitidas, limite de payload JSON em 1 MB e Rate Limiting geral na API.
  - **Validação Estrita da Assinatura Digital:** Validação de formato Base64 PNG/JPEG/WEBP com teto de 500 KB e sanitização de nome do signatário.
  - **Autenticação Multi-Tenant Segura:**
    - Cadastro, login e encerramento de sessão com hash criptográfico `scrypt` (`node:crypto`) e tokens de sessão de 32 bytes.
    - Isolamento de propostas, perfil e plano por pintor (`userId`). Cada pintor só acessa e gerencia os seus próprios dados.
  - **UI de Autenticação (`AuthModal`):** Modal de alta conversão integrado com alternância rápida entre Login e Cadastro.
  - **Bateria de Testes:** 43 testes automatizados passando (100% verde).
