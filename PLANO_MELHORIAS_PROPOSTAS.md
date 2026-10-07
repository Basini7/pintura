# PLANO DE MELHORIAS E APRIMORAMENTOS DO PROPOSAL BUILDER

## 1. Objetivo

Aprimorar a experiência de criação de propostas para transformar o fluxo atual de formulário longo em um editor comercial rápido, visual e profissional, preservando o motor técnico e financeiro já existente no projeto.

## 2. Premissas

- Mantém o domínio técnico, catálogo de áreas, pricing e API já existentes.
- Prioriza experiência mobile-first e eficiência operacional.
- Reduz carga cognitiva com fluxo guiado: Cliente → Serviços → Valores → Condições → Revisão.
- Evita duplicação de regras em frontend e backend.
- Mantém compatibilidade com a estrutura atual de propostas, escopo, PDF e WhatsApp.

## 3. Escopo principal

### 3.1 Prioridade máxima
- fluxo de nova proposta em etapas guiadas;
- cliente e imóvel como entidades reutilizáveis;
- revisão final e resumo financeiro fixo;
- autosave e rascunho local;
- escopo técnico resumido por padrão com edição sob demanda;
- pricing com valor por área e valor global;
- desconto percentual e nominal;
- condições de pagamento estruturadas;
- revisão final antes do envio.

### 3.2 Prioridade média
- modelos de proposta;
- duplicação com troca de cliente;
- clientes recentes e imóveis recentes;
- observações inteligentes;
- prazo e validade da proposta;
- status mais completo e proposta expirada;
- follow-up comercial após visualização.

### 3.3 Prioridade baixa / evolução
- dashboard comercial;
- métricas de conversão;
- alertas técnicos automáticos;
- inteligência de escopo e sugestões;
- integração mais profunda com proposta pública e aprovação.

---

## 4. Fases do plano

## Fase 0 — Diagnóstico e alinhamento técnico

### Objetivo
Confirmar o que já existe no código e definir a base para evolução sem reescrever o que já funciona.

### Entregáveis
- mapeamento dos componentes do Proposal Form;
- revisão de tipos, regras e serviços atuais;
- confirmação de APIs e persistência utilizadas;
- definição da arquitetura do editor de propostas.

### Atividades
- revisar `ProposalForm` e módulos relacionados;
- mapear `scopeCatalog`, `pricingEngine`, persistência e geração de PDF/WhatsApp;
- validar pontos de risco e de performance;
- definir quais regras ficarão no frontend e quais no backend.

### Critérios de saída
- lista de componentes a reusar;
- lista de componentes a decompor;
- definição do fluxo UX base;
- consenso sobre manter o motor técnico atual.

---

## Fase 1 — Redesenho do fluxo de criação da proposta

### Objetivo
Transformar a criação de proposta em um editor comercial guiado e mais rápido.

### Entregáveis
- layout de nova proposta com etapas: Cliente, Serviços, Valores, Condições e Revisão;
- resumo financeiro sempre visível;
- barra inferior fixa no mobile;
- painel lateral fixo no desktop;
- navegação por tabs ou etapas visuais.

### Atividades
- criar estrutura do fluxo principal;
- separar cliente, imóvel e proposta;
- introduzir resumo financeiro e status;
- deixar o escopo técnico visualmente mais enxuto;
- reaproveitar catálogo e motor de cálculo existentes.

### Critérios de saída
- usuário consegue completar a proposta sem depender de muitos campos técnicos iniciais;
- resumo visual do total aparece em qualquer etapa;
- mobile e desktop funcionam com o mesmo fluxo base.

---

## Fase 2 — Cliente e imóvel reutilizáveis

### Objetivo
Reduzir retrabalho e criar base de dados operacional mínima para cliente e imóvel.

### Entregáveis
- seleção de cliente existente;
- cadastro rápido de novo cliente;
- seleção de imóvel ou criação rápida;
- histórico de clientes e imóveis recentes.

### Atividades
- modelar cliente e imóvel de forma independente da proposta;
- permitir busca por nome, telefone ou endereço;
- otimizar cadastro rápido para situações de visita técnica;
- manter snapshot de dados em propostas já enviadas.

### Critérios de saída
- o usuário pode reutilizar clientes que já trabalham com a empresa;
- o cadastro de imóvel não exige duplicação desnecessária;
- proposta salva preserva os dados relevantes em seu momento de criação.

---

## Fase 3 — Serviços, escopo e edição sob demanda

### Objetivo
Tornar a seleção de serviços mais natural e menos burocrática.

### Entregáveis
- cartões grandes para áreas de trabalho;
- escopo sugerido automaticamente;
- edição genérica de etapas com opção de detalhar;
- suporte a itens opcionais e adicionais;
- alertas técnicos mínimos para áreas sensíveis.

### Atividades
- melhorar seleção de áreas e estrutura dos cards;
- mostrar escopo em texto resumido por padrão;
- permitir editar etapas em modal ou painel de detalhes;
- separar serviços principais de adicionais;
- confirmar que alterações em proposta não alteram o catálogo global.

### Critérios de saída
- área selecionada gera escopo com pouca ação manual;
- o usuário consegue editar com foco em decisão comercial;
- mudança em uma proposta não afeta templates globais.

---

## Fase 4 — Precificação, descontos e condições

### Objetivo
Posicionar preço e pagamento como eixo principal da proposta.

### Entregáveis
- valor global e por área;
- desconto percentual e nominal;
- acréscimo e regras visuais;
- estrutura de pagamento (entrada, parcelas, combinação);
- prazo estimado e validade da proposta.

### Atividades
- revisar `pricingEngine` e centralizar cálculo e regras;
- criar UI de seleção de pricing mode;
- implementar desconto e acréscimo com feedback imediato;
- incluir prazo e validade no resumo financeiro;
- revisar a lógica de `withInvoice` para UX mais clara.

### Critérios de saída
- o usuário vê total e a composição do valor sem confusão;
- regras de cálculo ficam centralizadas e auditáveis;
- pagamento e validade ficam claros na proposta final.

---

## Fase 5 — Autosave, performance e resilient UX

### Objetivo
Evitar perda de informações e reduzir o número de chamadas e ações repetitivas.

### Entregáveis
- autosave com debounce;
- indicador de status de salvamento;
- evitando recálculo em cada digitação;
- suporte a rascunho local e sincronização posterior.

### Atividades
- implementar debounce em cálculos de precificação;
- centralizar cálculo local em função pura compartilhada;
- manter estado `dirty` e último save;
- avaliar backend para cálculos críticos apenas em salvar/confirmar.

### Critérios de saída
- o usuário não perde proposta em caso de fechamento do navegador;
- a interface se mantém responsiva;
- cálculo complexo não dispara em cada tecla.

---

## Fase 6 — Revisão, revisão final e envio

### Objetivo
Reduzir erro de envio e melhorar a confiança na proposta concluída.

### Entregáveis
- tela de revisão final com checklist;
- botão principal de envio;
- opções de PDF, WhatsApp e link público;
- mensagem de resumo para cliente.

### Atividades
- criar painel final de revisão;
- verificar dados de cliente, imóvel, serviços, valor e condições;
- melhorar geração de WhatsApp e link de visualização;
- definir ações de envio e download.

### Critérios de saída
- proposta concluída pode ser revisada antes do envio;
- intenção comercial é clara antes do compartilhamento;
- o usuário evita retrabalho por erro de dados.

---

## Fase 7 — Histórico, status e gestão comercial

### Objetivo
Aumentar o valor do sistema para rotina comercial do pintor.

### Entregáveis
- lista de propostas com filtros por status;
- status completo (rascunho, enviada, em negociação, aprovada, recusada, expirada);
- duplicação com manutenção de dados e troca de cliente;
- versão e histórico de alterações.

### Atividades
- revisar `ProposalList` e ordenação visual;
- padronizar filtros e status;
- criar fluxo de duplicação e versão;
- incluir histórico de alterações relevantes.

### Critérios de saída
- o úsuario consegue localizar propostas rapidamente;
- ações comerciais ficam no centro da gestão;
- duplicação não altera original.

---

## Fase 8 — Evolução comercial e follow-up

### Objetivo
Transformar o sistema em ferramenta de acompanhamento comercial.

### Entregáveis
- modelos de proposta;
- follow-up após visualização;
- alertas de visualização e proposta expirada;
- dashboard inicial de indicadores simples.

### Atividades
- incluir notificação de visualização e convite de follow-up;
- criar templates para propostas comuns;
- preparar painéis de vendas básicos;
- definir mensagens e gatilhos automáticos.

### Critérios de saída
- proposta deixa de ser apenas um documento e vira um ciclo de conversão;
- o pintor consegue acompanhar melhor a evolução comercial.

---

## Fase 9 — Qualidade, testes e rollout

### Objetivo
Validar a entrega com foco em regressão e UX real.

### Entregáveis
- suíte de testes para o builder e as melhorias;
- QA funcional do fluxo principal;
- relatório de riscos e próximos refinamentos.

### Atividades
- testar cliente e imóvel;
- testar cálculo e desconto;
- validar PDF e WhatsApp;
- garantir mobile-first e acessibilidade mínima;
- verificar compatibilidade com o backend atual.

### Critérios de saída
- build estável;
- fluxo principal validado;
- regressões controladas;
- release planejada com grau de confiança adequado.

---

## 5. Ordem recomendada de execução

1. Fase 0 — diagnóstico e alinhamento
2. Fase 1 — redefinição do fluxo principal
3. Fase 2 — cliente e imóvel
4. Fase 3 — serviços e escopo
5. Fase 4 — precificação e condições
6. Fase 5 — autosave e performance
7. Fase 6 — revisão e envio
8. Fase 7 — histórico e status
9. Fase 8 — follow-up e modelos
10. Fase 9 — QA e rollout

---

## 6. Critérios de pronto

A mudança será considerada concluída quando:
- o usuário consegue criar uma proposta sem pensar em regras internas de catálogo;
- o fluxo funciona bem em mobile e desktop;
- o resumo financeiro está sempre visível;
- os cálculos são centralizados e consistentes;
- rascunhos e propostas enviadas ficam protegidos;
- PDF e WhatsApp refletem a proposta atual;
- a experiência parece profissional e rápida.

---

## 7. Riscos e mitigação

### Risco 1: reescrever funcionalidades que já existem
Mitigação: preservar motor técnico e pricing atual; refatorar apenas a camada de experiência.

### Risco 2: excesso de etapas e fricção
Mitigação: usar progress disclosure e resumo fixo.

### Risco 3: perda de proposta
Mitigação: autosave e rascunho local.

### Risco 4: abuso de complexidade em UI
Mitigação: separar detalhes técnicos em edição sob demanda.

### Risco 5: alteração de regra sem revisão
Mitigação: centralizar cálculo e validar por testes.

---

## 8. Conclusão

Este plano parte do princípio de que o projeto já possui uma base sólida em domínio, precificação, escopo e entrega. O principal ganho estará na experiência de criação da proposta: transformar um formulário técnico em um editor comercial rápido, confiável e voltado para a operação real do pintor.
