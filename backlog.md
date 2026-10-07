# BACKLOG TÉCNICO — Sistema de Propostas de Pintura

> **Governança:** AGENT_PLANNER  
> **Status do Backlog:** Aprovado para Execução (Com Motor de Escopo Inteligente por Área)  
> **Current Task:** TASK-001

---

## FASE 1: FUNDAÇÃO E SETUP

### [TASK-001] Setup do Projeto Vite + React + TypeScript + Tailwind CSS
- **Objetivo:** Inicializar a estrutura do projeto web limpa, configurada com Tailwind CSS e ícones essenciais.
- **Contexto:** Base da aplicação client-side rápida e responsiva.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `package.json`, `vite.config.ts`, `tailwind.config.js`, `src/App.tsx`, `src/index.css`.
- **Critérios de aceite:**
  - [ ] Projeto criado com Vite (React + TypeScript).
  - [ ] Tailwind CSS configurado e funcionando.
  - [ ] Lucide React instalado.
  - [ ] Build (`npm run build`) executando sem erros.
- **Testes necessários:** Execução do build de produção e inicialização local.
- **Prioridade:** CRÍTICA

### [TASK-002] Modelos de Domínio e Catálogo Técnico de Áreas/Processos
- **Objetivo:** Criar os tipos TypeScript e o catálogo estático de conhecimento com todas as Áreas de Trabalho e seus respectivos Processos/Etapas Técnicas padronizadas (baseado nas melhores práticas de propostas comerciais de pintura residencial).
- **Contexto:** Motor que permite ao sistema auto-preencher o roteiro técnico de execução assim que a área de trabalho for selecionada.
- **Dependências:** TASK-001.
- **Arquivos prováveis:** `src/types/proposal.ts`, `src/types/scopeCatalog.ts`, `src/data/standardScopes.ts`.
- **Critérios de aceite:**
  - [ ] Interfaces para Áreas, Etapas Técnicas, Procedimentos, Proposta, Prestador e Cliente.
  - [ ] Catálogo completo com templates para:
    - *Área Interna: Paredes e Tetos* (proteção de pisos/móveis, seladora gesso, massa corrida, lixamento, demãos tinta).
    - *Área Interna: Portas e Guarnições* (lixamento, massa madeira, pintura esmalte).
    - *Área Interna: Sótão / Vigas / Forros* (lixamento madeira, verniz, esmalte vigas, teto banheiro).
    - *Área Externa: Fachadas* (forração, hidrojateamento/remoção, fundo preparador, selador acrílico, textura cristal/granfino/microrevestimento).
    - *Área Externa: Muros* (limpeza, correções, fundo preparador, textura rolada/acrílica).
    - *Área Externa: Rufos, Calhas e Pingadeiras* (lixamento, convertedor de ferrugem, esmalte sintético).
    - *Área Externa: Rodapés* (calafetação com selante PU).
- **Testes necessários:** Validação estática de tipos e integridade do catálogo de dados.
- **Prioridade:** CRÍTICA

---

## FASE 2: NÚCLEO DE DADOS E REGRAS DE NEGÓCIO

### [TASK-003] Motor de Persistência Local (Storage Repository)
- **Objetivo:** Implementar repositório com LocalStorage para persistir perfil do prestador e lista de propostas, com utilitário de exportar/importar backup JSON.
- **Contexto:** Garantir funcionamento offline e retenção total dos dados no dispositivo.
- **Dependências:** TASK-002.
- **Arquivos prováveis:** `src/services/storage.ts`.
- **Critérios de aceite:**
  - [ ] CRUD de Propostas (listar, obter por id, salvar/atualizar, excluir).
  - [ ] Obter e salvar Perfil do Prestador com dados padrão pré-carregados (dados genéricos configuráveis).
  - [ ] Função para exportar todos os dados em `.json` e restaurar a partir de arquivo.
- **Testes necessários:** Testes de gravação e recuperação do LocalStorage.
- **Prioridade:** ALTA

### [TASK-004] Motor de Cálculos e Regras Financeiras
- **Objetivo:** Centralizar cálculos matemáticos de itens (m² vs fixo), subtotais, descontos percentuais/nominais e parcelamentos.
- **Contexto:** Garantir consistência financeira sem erros de arredondamento.
- **Dependências:** TASK-002.
- **Arquivos prováveis:** `src/utils/calculations.ts`.
- **Critérios de aceite:**
  - [ ] Função para calcular subtotal de cada área/etapa.
  - [ ] Totalizador de mão de obra e/ou material.
  - [ ] Cálculo de condições de pagamento (ex: parcelas, quinzenais até quinta-feira, 30/40/30).
  - [ ] Formatação de moeda BRL (`R$`).
- **Testes necessários:** Validação de cálculo unitário e global.
- **Prioridade:** ALTA

---

## FASE 3: INTERFACE DO USUÁRIO (MOBILE-FIRST)

### [TASK-005] Shell da Aplicação, Navegação e Configuração de Perfil
- **Objetivo:** Criar o cabeçalho, navegação (Propostas / Nova Proposta / Dados do Pintor) e modal/tela de configuração dos dados do prestador.
- **Contexto:** O pintor precisa configurar seus dados e telefones de cabeçalho.
- **Dependências:** TASK-003.
- **Arquivos prováveis:** `src/components/Header.tsx`, `src/components/ProfileModal.tsx`, `src/App.tsx`.
- **Critérios de aceite:**
  - [ ] Navegação adaptada para smartphone e desktop.
  - [ ] Formulário de dados do prestador com validação e salvamento automático.
- **Testes necessários:** Verificação visual mobile e persistência dos dados cadastrados.
- **Prioridade:** ALTA

### [TASK-006] Formulário Guiado com Seleção de Área e Auto-Preenchimento de Processo
- **Objetivo:** Interface ágil onde o usuário seleciona as áreas de trabalho da obra e o sistema injeta instantaneamente o processo e etapas técnicas correspondentes, permitindo personalização ágil e inserção de valores.
- **Contexto:** Fluxo principal de uso pelo pintor em campo.
- **Dependências:** TASK-002, TASK-004, TASK-005.
- **Arquivos prováveis:** `src/components/ProposalForm.tsx`, `src/components/AreaScopeSelector.tsx`.
- **Critérios de aceite:**
  - [ ] Seletor rápido de Áreas de Trabalho (com 1 clique adiciona "Fachadas", "Paredes e Tetos", etc.).
  - [ ] Auto-carregamento das etapas e procedimentos técnicos daquela área.
  - [ ] Permite adicionar, editar ou remover itens/etapas conforme particularidade da obra.
  - [ ] Campo para valor (Mão de obra ou Mão de Obra + Material).
  - [ ] Seção de Condições de Pagamento e Validade.
- **Testes necessários:** Teste de inclusão de múltiplas áreas e validação de auto-preenchimento.
- **Prioridade:** CRÍTICA

### [TASK-007] Painel de Histórico e Gestão de Propostas
- **Objetivo:** Listagem visual de propostas criadas com filtros por status e ações rápidas (visualizar, editar, duplicar, deletar).
- **Contexto:** Gestão de orçamentos pendentes, aprovados e arquivados.
- **Dependências:** TASK-006.
- **Arquivos prováveis:** `src/components/ProposalList.tsx`, `src/components/ProposalCard.tsx`.
- **Critérios de aceite:**
  - [ ] Lista ordenada por data.
  - [ ] Badges coloridos por status.
  - [ ] Ação de duplicar proposta para novo cliente.
  - [ ] Busca por nome do cliente.
- **Testes necessários:** Teste de duplicação, exclusão e alteração de status.
- **Prioridade:** MÉDIA

---

## FASE 4: ENTREGÁVEIS AO CLIENTE (WHATSAPP & PDF)

### [TASK-008] Gerador de Mensagem WhatsApp Formatada
- **Objetivo:** Gerar texto formatado, elegante e conciso com emojis para envio direto ao WhatsApp do cliente com 1 clique.
- **Contexto:** Canal de aprovação rápida.
- **Dependências:** TASK-006.
- **Arquivos prováveis:** `src/utils/whatsappGenerator.ts`, `src/components/WhatsAppShareModal.tsx`.
- **Critérios de aceite:**
  - [ ] Resumo das áreas e etapas de trabalho em tópicos legíveis.
  - [ ] Valor da mão de obra, condições de pagamento e validade.
  - [ ] Botão de "Copiar" e "Disparar WhatsApp".
- **Testes necessários:** Validação do formato no WhatsApp Web/Mobile.
- **Prioridade:** ALTA

### [TASK-009] Motor de Geração de Proposta Formal em PDF (Layout Padrão Profissional)
- **Objetivo:** Gerar PDF idêntico aos padrões formais de mercado, com cabeçalho corporativo, divisão formal de Escopo dos Serviços Internos/Externos, etapas técnicas com marcadores, valores destacados e condições de pagamento.
- **Contexto:** Entregável formal para clientes residenciais e condomínios.
- **Dependências:** TASK-006.
- **Arquivos prováveis:** `src/services/pdfGenerator.ts`, `src/components/PDFPreviewModal.tsx`.
- **Critérios de aceite:**
  - [ ] Layout idêntico ao modelo de referência (cabeçalho, identificação da obra, áreas de trabalho, etapas detalhadas com sub-itens, quadro financeiro e rodapé com endereço/telefone).
  - [ ] Geração client-side rápida.
  - [ ] Download direto do arquivo PDF.
- **Testes necessários:** Teste visual do PDF gerado comparando com os modelos em anexo.
- **Prioridade:** CRÍTICA

---

## FASE 5: REVISÃO DE QUALIDADE (QA) E FINALIZAÇÃO

### [TASK-010] Auditoria de Qualidade, Usabilidade e Fechamento
- **Objetivo:** Validação end-to-end pelo AGENT_QA cobrindo todos os cenários dos anexos.
- **Contexto:** Garantia de produto pronto para uso real de pintores.
- **Dependências:** Todas as tarefas anteriores.
- **Arquivos prováveis:** Todo o repositório.
- **Critérios de aceite:**
  - [ ] Zero erros no console e build sem falhas.
  - [ ] Teste de emissão de proposta externa e interna nos moldes dos anexos.
  - [ ] Relatório de QA (`TEST_RESULTS.md`) com veredito PASS.
- **Prioridade:** CRÍTICA

---

## FASE 6: MELHORIAS DE UX, PRODUTO E OPERAÇÃO COMERCIAL

### [TASK-011] Redesenho do Flow de Nova Proposta como Editor Comercial
- **Objetivo:** Transformar a criação da proposta em um fluxo guiado com etapas lógicas de Cliente → Serviços → Valores → Condições → Revisão.
- **Contexto:** O sistema técnico já existe; agora a prioridade é reduzir fricção e carga cognitiva da experiência.
- **Dependências:** TASK-006, TASK-007.
- **Arquivos prováveis:** `src/components/ProposalForm.tsx`, `src/components/ProposalList.tsx`, `src/components/PricingPanel.tsx`, `src/components/ProposalReview.tsx`.
- **Critérios de aceite:**
  - [ ] Etapas visuais com resumo financeiro sempre visível.
  - [ ] Estrutura mobile-first com barra inferior fixa.
  - [ ] Escopo técnico resumido por padrão e edição detalhada sob demanda.
  - [ ] Fluxo navegável sem excesso de campos técnicos iniciais.
- **Prioridade:** CRÍTICA

### [TASK-012] Cliente e Imóvel Reutilizáveis no Fluxo Principal
- **Objetivo:** Separar cliente, imóvel e proposta para reduzir retrabalho e permitir reaproveitamento.
- **Contexto:** O cliente e o imóvel devem ser entidades operacionais e não apenas campos embutidos na proposta.
- **Dependências:** TASK-011.
- **Arquivos prováveis:** `src/components/CustomerSelector.tsx`, `src/components/PropertySelector.tsx`, `src/types/*.ts`.
- **Critérios de aceite:**
  - [ ] Busca por cliente e apresentação de resultados relevantes.
  - [ ] Cadastro rápido de novo cliente e imóvel.
  - [ ] Reutilização de imóveis anteriores no mesmo cliente.
  - [ ] Snapshot preservado em propostas já emitidas.
- **Prioridade:** ALTA

### [TASK-013] Serviços e Escopo Inteligente com Edição Sob Demanda
- **Objetivo:** Tornar a seleção de áreas e processos mais natural e menos burocrática.
- **Contexto:** A estratégia é reduzir a sensação de formulário técnico e aumentar a sensação de editor profissional.
- **Dependências:** TASK-011, TASK-002.
- **Arquivos prováveis:** `src/components/AreaScopeSelector.tsx`, `src/components/ScopeEditor.tsx`, `src/data/standardScopes.ts`.
- **Critérios de aceite:**
  - [ ] Cartões grandes para seleção de áreas.
  - [ ] Escopo resolvido automaticamente com base no catálogo.
  - [ ] Edição detalhada apenas quando necessário.
  - [ ] Suporte a adicionais e itens opcionais.
- **Prioridade:** CRÍTICA

### [TASK-014] Precificação, Desconto e Condição de Pagamento dentro do Fluxo
- **Objetivo:** Posicionar valor e pagamento como protagonistas da criação da proposta.
- **Contexto:** O sistema já possui precificação, mas precisa de melhor apresentação e clareza comercial.
- **Dependências:** TASK-004, TASK-011.
- **Arquivos prováveis:** `src/components/PricingPanel.tsx`, `src/utils/calculations.ts`, `src/types/proposal.ts`.
- **Critérios de aceite:**
  - [ ] Suporte a valor global e por área.
  - [ ] Desconto percentual e nominal.
  - [ ] Formas de pagamento estruturadas e mais legíveis.
  - [ ] Prazo estimado e validade da proposta na mesma área de decisão.
- **Prioridade:** CRÍTICA

### [TASK-015] Autosave, Rascunho e Performance da Geração de Propostas
- **Objetivo:** Melhorar confiabilidade e responsividade da interface sem quebrar as regras de negócio.
- **Contexto:** O sistema não pode depender de salvar manualmente em momentos críticos.
- **Dependências:** TASK-011, TASK-014.
- **Arquivos prováveis:** `src/components/ProposalForm.tsx`, `src/services/storage.ts`, `src/utils/calculations.ts`.
- **Critérios de aceite:**
  - [ ] Autosave automátic o com debounce.
  - [ ] Indicador de rascunho e último salvamento.
  - [ ] Cálculo crítico centralizado e menos dependente de interação em tempo real.
  - [ ] Dados não são perdidos em fechamento do navegador.
- **Prioridade:** ALTA

### [TASK-016] Revisão Final, Envio e Melhorias no WhatsApp/PDF
- **Objetivo:** Prover revisão antes do envio e melhorar confiabilidade da entrega final.
- **Contexto:** A etapa final deve remover erros de comunicação e facilitar a decisão do cliente.
- **Dependências:** TASK-011, TASK-014, TASK-008, TASK-009.
- **Arquivos prováveis:** `src/components/ProposalReview.tsx`, `src/utils/whatsappGenerator.ts`, `src/services/pdfGenerator.ts`.
- **Critérios de aceite:**
  - [ ] Checklist final com dados do cliente, imóvel, serviços, valor e condições.
  - [ ] Mensagem WhatsApp mais concisa, com foco em link e resumo.
  - [ ] PDF formal consistente com a proposta atual.
- **Prioridade:** ALTA

### [TASK-017] Histórico, Status, Duplicação e Follow-up Comercial
- **Objetivo:** Evoluir o sistema de gestão para uma operação comercial mais robusta.
- **Contexto:** O produto deve apoiar não só a criação mas também o acompanhamento da proposta.
- **Dependências:** TASK-007, TASK-015, TASK-016.
- **Arquivos prováveis:** `src/components/ProposalList.tsx`, `src/components/ProposalCard.tsx`, `src/services/api.ts`.
- **Critérios de aceite:**
  - [ ] Status completo e filtros mais úteis.
  - [ ] Duplicação inteligente com troca de cliente.
  - [ ] Visualização e follow-up após proposta enviada.
  - [ ] Histórico de versões e rastreio de visualização.
- **Prioridade:** MÉDIA

### [TASK-018] Modelos de Proposta e Dashboard Comercial Inicial
- **Objetivo:** Aumentar velocidade de criação e oferecer visão comercial básica.
- **Contexto:** O pintor precisa criar propostas repetidas e acompanhar seu desempenho.
- **Dependências:** TASK-017.
- **Arquivos prováveis:** `src/components/Dashboard.tsx`, `src/components/ProposalTemplates.tsx`.
- **Critérios de aceite:**
  - [ ] modelos de proposta reutilizáveis;
  - [ ] dashboard com propostas, valores e médias;
  - [ ] base para evolução em métricas e conversão.
- **Prioridade:** MÉDIA

---
