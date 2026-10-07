# DECISION LOG

## ADR-001: Incorporação do Framework AI-DEV-SYSTEM
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Necessidade de orquestração multiagente estruturada, rigorosa e econômica em tokens.
- **Decisão:** Adotar protocolo estrito de papéis (Orquestrador, Architect, Planner, Developer, QA) e plugins de governança (`Caveman` para saídas telegráficas, `Ponytail` para YAGNI radical).
- **Consequências:** Fases sequenciais obrigatórias (`DISCOVERY -> PLANNING -> TASK_BREAKDOWN -> IMPLEMENTATION -> QUALITY_CHECK`). Código só é produzido após backlog aprovado pelo Planner.

---

## ADR-002: Arquitetura em Camadas (Backend API First + Frontend Client)
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Garantir que toda a lógica de negócio, catálogo de processos de pintura, persistência e cálculos estejam encapsulados em um Backend robusto, modular e testável antes da integração da UI.
- **Decisão:** Backend em Node.js (TypeScript) + Express/Router com repositório estruturado e testes automatizados.
- **Consequências:** Separação limpa de responsabilidades, testabilidade total pelo `AGENT_QA`.

---

## ADR-003: Automação Inteligente de Escopo e Processos Técnicos por Área de Trabalho
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Evitar digitação manual de texto livre repetitivo durante a criação de propostas.
- **Decisão:** Motor de escopo automático pré-carregando processos ao marcar as áreas de trabalho.

---

## ADR-004: Modelagem de Domínio Hierárquica em Cadeia (3 Níveis)
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Necessidade de estrutura lógica rigorosa e extensível para mapear áreas de trabalho aos processos técnicos.
- **Decisão:** Padrão em 3 níveis (Substrato -> Processo Padrão -> Áreas Selecionáveis).

---

## ADR-005: Consolidação das Regras Comerciais e Financeiras
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Validação dos blocos de precificação e condições comerciais.
- **Decisão:**
  - Precificação híbrida (valor por área somado automaticamente ou valor global fechado da obra).
  - Comutador "Apenas Mão de Obra" / "Mão de Obra + Material Incluso".
  - Condições de pagamento com opções rápidas ("A combinar", "A cada 2 semanas até quinta-feira", "30/40/30", personalizado).
  - Cláusulas rápidas ("Sem emissão de NF", validade 30 dias).
- **Consequências:** Alinhamento perfeito com o comportamento real de orçamentação e fechamento de serviços.

---

## ADR-006: Web Proposal Viewer e Assinatura Digital On-Canvas
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Enviar apenas PDF e texto no WhatsApp causa "buraco negro" de feedback para o prestador (não sabe se o cliente leu nem quando vai fechar) e aumenta fricção de fechamento (cliente precisa imprimir ou responder texto informal).
- **Decisão:**
  - Criação de visualizador web responsivo (`PublicProposalViewer`) com suporte a hash routing (`#proposta=:id`).
  - Rastreamento passivo de visualizações (`POST /api/proposals/:id/view`) no carregamento da página pública.
  - Assinatura digital direta em `<canvas>` com suporte a eventos de mouse e toque móvel (`touchstart`, `touchmove`, `touchend`).
  - Armazenamento da assinatura em imagem raster base64 com carimbo de data/hora e nome do titular.
- **Consequências:** Redução drástica do ciclo de venda, aumento de conversão e rastreabilidade total para o prestador de serviços.

---

## ADR-007: Gestão de Quotas e Monetização SaaS com Paywall Modal
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Monetizar o produto via planos recorrentes (Básico R$ 38, Intermediário R$ 47, Pro R$ 59) preservando uma degustação gratuita de 1 proposta para entrega rápida do valor.
- **Decisão:**
  - Checagem de cotas no backend em `POST /api/proposals` e `POST /api/proposals/:id/duplicate`.
  - Edição de propostas existentes não consome nova cota.
  - Ao estourar a cota, a API retorna HTTP 403 `QUOTA_EXCEEDED` com mensagem persuasiva e dados da assinatura.
  - O frontend intercepta e abre o `UpgradeModal` com ancoragem de preço (Good-Better-Best) e ativação com 1 clique.
  - Marca d'água no PDF e web nos planos Free/Básico/Intermediário, e removida no plano Pro.
- **Consequências:** Funil de conversão automático onde o usuário experimenta o valor na primeira proposta e é incentivado a assinar para escalar seu negócio.

---

## ADR-008: Blindagem de Segurança e Autenticação Multi-Tenant
- **Data:** 2026-10-06
- **Status:** Aprovado
- **Contexto:** Garantir que o produto esteja pronto para comercialização na internet com isolamento estrito de dados entre pintores, proteção contra DoS, validação de inputs e proteção contra bypass de planos.
- **Decisão:**
  - `Helmet` para injeção de cabeçalhos de segurança HTTP (`X-Frame-Options`, `X-Content-Type-Options`) e ocultação de `X-Powered-By`.
  - CORS configurado restritivamente para origens autorizadas.
  - Rate limiting geral de 120 req/min e limite de payload JSON de 1 MB.
  - Autenticação com derivação de chave criptográfica `scrypt` (`node:crypto`) e sessões tokenizadas de 32 bytes (`sessions.json`).
  - Isolamento de propostas e configurações por `userId` (Multi-Tenancy). O usuário A não pode ler, alterar, duplicar ou deletar orçamentos do usuário B.
  - Validação rigorosa da assinatura digital (formato Base64 PNG/JPEG/WEBP com limite de 500 KB e sanitização de nome).
- **Consequências:** A plataforma está blindada contra vazamento de dados, injeção de scripts e acessos indevidos.
