<!-- GSD:project-start source:PROJECT_CONTEXT.md -->

# PROJECT CONTEXT — Sistema de Propostas Comerciais para Pintura Residencial

## 1. OBJETIVO DO PRODUTO

O projeto `pintura` é um sistema web para **criação rápida, padronizada e profissional de propostas comerciais para empreiteiros, pintores autônomos e pequenas empresas de pintura residencial**.

O sistema deve funcionar principalmente como uma ferramenta de campo: o profissional pode estar na residência do cliente, levantar as áreas que serão executadas, selecionar os processos técnicos correspondentes, informar quantidades/valores e sair da visita com uma proposta pronta para PDF e WhatsApp.

O produto NÃO deve ser tratado como ERP de loja de tintas, estoque, PDV ou sistema fiscal.

### Objetivo central

> Transformar uma vistoria/orçamento em uma proposta comercial profissional com o menor número possível de etapas manuais.

### Princípios do produto

1. **Rapidez:** criar uma proposta em poucos minutos.
2. **Padronização:** o sistema deve sugerir automaticamente o escopo técnico.
3. **Flexibilidade:** o empreiteiro pode editar o escopo sugerido.
4. **Clareza comercial:** o cliente deve entender o que será feito, quanto custará e como será pago.
5. **Mobile-first:** o fluxo principal deve funcionar muito bem no celular.
6. **Reutilização:** clientes, imóveis, serviços e propostas anteriores devem ser reaproveitáveis.
7. **Não esconder regras:** cálculos financeiros devem ser previsíveis e auditáveis.
8. **Não apagar histórico:** alterações importantes devem preservar versões quando a proposta já tiver sido enviada.

---

# 2. ESTADO ATUAL DO REPOSITÓRIO

O repositório atual já possui:

- Vite + React + TypeScript;
- Tailwind CSS;
- Express;
- Vitest;
- jsPDF + jsPDF-AutoTable;
- PostgreSQL (`pg`);
- Supabase;
- Lucide React;
- estrutura `src/` e `server/`;
- catálogo de escopo;
- motor de precificação;
- persistência/repositório;
- API;
- geração de PDF;
- geração de WhatsApp.

O `package.json` identifica o projeto como `sistema-propostas-pintura` e possui scripts separados para servidor, cliente, build e testes. A geração de PDF já utiliza `jspdf` e `jspdf-autotable`. Não substituir tecnologias existentes sem necessidade.

O backlog atual descreve LocalStorage como estratégia de persistência, enquanto o `package.json` já contém `@supabase/supabase-js` e `pg`. Portanto:

- não reconstruir o sistema de persistência sem antes verificar a implementação existente;
- não remover Supabase/PG apenas porque o backlog antigo menciona LocalStorage;
- o agente deve considerar o código existente como fonte de verdade da implementação;
- este documento define o comportamento desejado do produto, não uma ordem para reescrever tudo.

---

# 3. DOMÍNIO TÉCNICO

## 3.1 Hierarquia em cadeia

A seleção de escopo segue:

```text
MACRO-CATEGORIA / SUBSTRATO
          ↓
PROCESSO TÉCNICO
          ↓
ÁREA DE TRABALHO
          ↓
ITEM DA PROPOSTA
          ↓
QUANTIDADE / UNIDADE / PREÇO
```

O usuário normalmente seleciona a **Área de Trabalho**.

O sistema resolve automaticamente:

```text
Área → Substrato → Processo Técnico
```

O usuário não deve precisar conhecer os códigos internos.

---

# 4. MACRO-CATEGORIAS / SUBSTRATOS

## 4.1 ALVENARIA_INTERNA

Processo padrão:

1. Forração e proteção com lona e/ou papelão dos pisos e áreas não pintáveis.
2. Aplicação de seladora.
3. Aplicação de massa corrida:
   - 02 demãos para tetos;
   - correções pontuais para paredes.
4. Lixamento técnico para regularização.
5. Pintura de acabamento com 02 a 03 demãos de tinta na cor escolhida.

## 4.2 ALVENARIA_EXTERNA

Processo padrão:

1. Forração e proteção dos pisos e objetos não pintáveis.
2. Preparação:
   - Limpeza simples; OU
   - Lavagem por hidrojateamento.
3. 01 demão de Fundo Preparador de Paredes.
4. 02 demãos de Selador Acrílico.
5. Acabamento:
   - Pintura Acrílica; OU
   - Textura Acrílica:
     - Cristal;
     - Granfino Hidro-repelente;
     - Outra.
6. Opcional:
   - tratamento/revitalização de cimento queimado com lixamento e hidrofugante.

## 4.3 MADEIRAMENTOS

1. Lixamento técnico e limpeza.
2. Correção de pequenas imperfeições com massa para madeira.
3. Acabamento:
   - Verniz: brilhante, acetinado, fosco ou stain; OU
   - Esmalte Sintético.

## 4.4 METALICOS

1. Lixamento mecânico/manual e limpeza.
2. Convertedor de ferrugem quando necessário.
3. Fundo Sintético / primer anticorrosivo.
4. Esmalte Sintético de acabamento.

---

# 5. ÁREAS DE TRABALHO

| ID | Área | Substrato |
|---|---|---|
| `PAREDES` | Paredes | `ALVENARIA_INTERNA` |
| `TETOS` | Tetos | `ALVENARIA_INTERNA` |
| `FACHADA_EXTERNA` | Fachada Externa | `ALVENARIA_EXTERNA` |
| `MUROS` | Muros | `ALVENARIA_EXTERNA` |
| `PORTAS` | Portas | `MADEIRAMENTOS` |
| `FORROS_MADEIRA` | Forros de madeira | `MADEIRAMENTOS` |
| `TESTEIRAS` | Testeiras | `MADEIRAMENTOS` |
| `RUFOS` | Rufos | `METALICOS` |
| `CALHAS` | Calhas | `METALICOS` |
| `GRADES` | Grades | `METALICOS` |
| `PORTAO` | Portão | `METALICOS` |

O catálogo atual do repositório já possui um motor de escopo em três níveis e deve ser preservado/evoluído em vez de substituído por regras duplicadas.

---

# 6. MODELO MENTAL DA PROPOSTA

A proposta deve ser entendida como:

```text
PROPOSTA
│
├── Cliente
│
├── Imóvel
│
├── Objetivo
│
├── Escopo
│   ├── Área 1
│   │   ├── Processo técnico
│   │   ├── Quantidade
│   │   ├── Unidade
│   │   ├── Acabamento
│   │   ├── Cor
│   │   ├── Observações
│   │   └── Valor
│   │
│   ├── Área 2
│   └── Área N
│
├── Condições comerciais
│
├── Investimento
│
└── Saídas
    ├── PDF
    └── WhatsApp
```

---

# 7. UX PRINCIPAL — NOVA PROPOSTA

A tela de nova proposta deve ser o coração do sistema.

Não criar um wizard excessivamente fragmentado em muitas páginas.

Preferir uma **tela única guiada**, com seções progressivas e resumo financeiro sempre acessível.

## 7.1 Cabeçalho

Exibir:

- botão voltar;
- título `Nova proposta`;
- número provisório;
- status `Rascunho`;
- ação `Salvar`;
- ação `Visualizar`.

No mobile, manter as ações essenciais acessíveis.

## 7.2 Direção de produto após análise de UX

A análise de experiência do produto indica que o sistema já tem um núcleo técnico sólido, mas a criação da proposta ainda se apresenta como um formulário longo em vez de um editor comercial. O próximo salto estratégico não é acrescentar dezenas de recursos isolados; é transformar a jornada de orçamento em um fluxo rápido, visual e profissional.

### Objetivo da jornada

A proposta deve ser percebida como uma experiência de:

- Cliente → Serviços → Valores → Condições → Revisão;
- criação rápida no celular e no desktop;
- visualização clara do resumo financeiro em qualquer momento;
- menor carga cognitiva por etapa, com disclosure progressivo do conteúdo técnico;
- decisão comercial centrada no que importa: o que será executado, quanto custa e como será enviado.

### Diretrizes de UX

1. Remover o caráter de formulário técnico excessivo quando o usuário ainda está definindo a oferta.
2. Apresentar o escopo como texto resumido por padrão e permitir edição detalhada sob demanda.
3. Estruturar o fluxo em etapas claras, mas com uma visão geral do progresso e resumo financeiro sempre acessível.
4. Separar claramente cliente, imóvel e proposta, mantendo a capacidade de reutilizar clientes e imóveis anteriores.
5. Priorizar o papel de preço e pagamento como protagonistas da jornada, com opções visuais de cálculo e revisão.
6. Incluir autosave e rascunho local antes de qualquer confirmação de envio.
7. Construir a experiência para que o usuário possa começar sem bloqueio de cadastro e só exigir conta ao salvar/compartilhar formalmente.
8. Oferecer modo rápido e modo detalhado para atender tanto a vistoria rápida quanto a proposta técnica completa.

### Fluxo recomendado

```text
Cliente e obra
    ↓
Serviços
    ↓
Valores
    ↓
Condições
    ↓
Revisão e envio
```

Esse fluxo deve ser implementado como tela única guiada, com resumo lateral ou barra fixa inferior dependendo do dispositivo. O critério principal é manter o usuário focado no objetivo comercial final e reduzir ações redundantes.

### Prioridades de produto

1. Renovar a experiência de criação de proposta como editor comercial mobile-first.
2. Melhorar a produtividade com autosave, revisão final e resumo financeiro fixo.
3. Aprimorar a gestão de cliente e imóvel para reutilização e menor retrabalho.
4. Evoluir a precificação para permitir valor global, por área, desconto percentual e nominal, e regras estruturadas de pagamento.
5. Ampliar o valor do produto com modelos de proposta, duplicação inteligente, status completo e follow-up comercial.
6. Guardar o motor técnico e financeiro atual, expandindo a apresentação e a experiência sem dobrar a complexidade do domínio.

### Regras estratégicas

- Não substituir o motor de escopo e pricing existente por regras duplicadas no frontend.
- Preservar sempre snapshots de propostas publicadas ou enviadas.
- Usar acesso progressivo à edição: detalhes subtécnicos apenas quando solicitados.
- Manter o produto orientado a atividade operacional e comercial do pintor, sem transformar a ferramenta em CRM, ERP ou gestão completa de obra.
- Considerar toda melhoria de UX como parte de um ciclo contínuo de refinamento do Proposal Builder.

---

# 8. ETAPA 1 — CLIENTE

## Comportamento

Primeiro campo:

**Cliente**

Possibilidades:

- selecionar cliente existente;
- cadastrar novo cliente.

### Campos

- Nome;
- Telefone;
- WhatsApp;
- E-mail;
- CPF/CNPJ opcional;
- Observações.

### UX

Ao digitar o nome, mostrar resultados existentes.

Exemplo:

```text
Cliente
[ João da Silva                    ]

Clientes encontrados:
┌─────────────────────────────────┐
│ João da Silva                   │
│ (12) 99999-9999                 │
└─────────────────────────────────┘

[ + Cadastrar novo cliente ]
```

Não obrigar o usuário a preencher todos os dados para começar o orçamento.

---

# 9. ETAPA 2 — IMÓVEL

Após selecionar o cliente:

**Imóvel / Local da obra**

Campos:

- Endereço;
- Número;
- Complemento;
- Bairro;
- Cidade;
- Estado;
- Tipo de imóvel.

Tipos:

- Casa;
- Sobrado;
- Apartamento;
- Área externa;
- Comercial/residencial;
- Outro.

Se o cliente já possuir imóveis cadastrados, oferecer seleção.

---

# 10. ETAPA 3 — OBJETIVO DA PROPOSTA

Campo curto:

**Objetivo dos serviços**

Exemplo:

> Execução de serviços de pintura interna e externa, incluindo preparação das superfícies e aplicação dos revestimentos de acabamento especificados nesta proposta.

Permitir edição livre.

Oferecer textos sugeridos, mas nunca obrigar o usuário a usar o texto padrão.

---

# 11. ETAPA 4 — SELEÇÃO DE ÁREAS

Esta é a etapa mais importante da experiência.

Mostrar cartões grandes:

```text
┌──────────────┐ ┌──────────────┐
│ 🧱           │ │ ▱            │
│ Paredes      │ │ Tetos        │
└──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ 🏠           │ │ ▤            │
│ Fachada      │ │ Muros        │
└──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ 🚪           │ │ ▥            │
│ Portas       │ │ Madeiramento │
└──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ ⚙            │ │ +            │
│ Metálicos    │ │ Outro serviço│
└──────────────┘ └──────────────┘
```

No desktop pode ser grid.

No celular, 2 colunas.

Ao tocar em uma área:

1. adicionar área à proposta;
2. resolver substrato;
3. carregar processo técnico;
4. abrir automaticamente a configuração daquela área.

---

# 12. CONFIGURAÇÃO DE CADA ÁREA

Cada área adicionada deve aparecer como um card expansível.

Exemplo:

```text
┌─────────────────────────────────────┐
│ PAREDES                         ⋮   │
│ Alvenaria interna                  │
│                                     │
│ Quantidade: [ 180 ] [ m² ]         │
│                                     │
│ Processo técnico                   │
│ ☑ Proteção                          │
│ ☑ Seladora                          │
│ ☑ Massa corrida / correções        │
│ ☑ Lixamento                         │
│ ☑ Pintura 2-3 demãos               │
│                                     │
│ Acabamento                          │
│ [ Tinta acrílica               ▼ ] │
│                                     │
│ Cor                                 │
│ [ Branco                             ]│
│                                     │
│ Valor                               │
│ [ R$ 3.500,00                       ]│
└─────────────────────────────────────┘
```

---

# 13. PROCESSO TÉCNICO EDITÁVEL

O sistema deve sugerir as etapas automaticamente.

O usuário pode:

- editar texto;
- remover etapa;
- adicionar etapa;
- reordenar etapa.

IMPORTANTE:

A edição feita em uma proposta **não altera o template global**.

Exemplo:

```text
Template padrão
      ↓
Cópia para proposta
      ↓
Usuário edita
      ↓
Somente a proposta é alterada
```

---

# 14. OPÇÕES CONDICIONAIS

O formulário deve mostrar campos conforme a escolha.

## Fachada / Muros

Se acabamento = `Textura Acrílica`:

mostrar:

- Cristal;
- Granfino Hidro-repelente;
- Outra.

Se limpeza = `Hidrojateamento`:

mostrar a etapa correspondente no escopo.

## Madeiramentos

Se acabamento = `Verniz`:

mostrar:

- Brilhante;
- Acetinado;
- Fosco;
- Stain.

Se acabamento = `Esmalte`:

mostrar:

- cor;
- acabamento, se aplicável.

## Metálicos

Mostrar:

**Tratamento de ferrugem**

- Não necessário;
- Onde necessário.

Não exibir opções irrelevantes para a área escolhida.

---

# 15. OUTRO SERVIÇO

O usuário deve poder adicionar um serviço não contemplado no catálogo.

Campos:

- Nome;
- Descrição;
- Unidade;
- Quantidade;
- Valor;
- Observações.

Esse serviço não deve obrigatoriamente pertencer a um dos quatro substratos.

---

# 16. PRECIFICAÇÃO

## Modo A — por área

Cada área possui valor.

```text
Paredes       R$ 3.500,00
Tetos         R$ 1.800,00
Portas        R$   900,00
Portão        R$   650,00
--------------------------
Subtotal      R$ 6.850,00
```

## Modo B — global

Exibir:

```text
Valor fechado da obra

R$ 6.850,00
```

Não obrigar o usuário a distribuir o valor entre as áreas.

## Se houver quantidade

Permitir:

```text
Quantidade × Preço unitário = Subtotal
```

Mas não obrigar precificação por m².

O empreiteiro pode trabalhar com preço fechado por ambiente/serviço.

---

# 17. FORNECIMENTO

Componente obrigatório:

```text
Quem fornece os materiais?

( ) Apenas mão de obra
( ) Mão de obra + material
```

Se `Apenas mão de obra`:

mostrar imediatamente:

> Materiais por conta do contratante.

Permitir editar esse texto.

---

# 18. DESCONTO E ACRÉSCIMO

Na área financeira:

```text
Subtotal              R$ 10.000,00

Desconto
[ R$ ] [ 500,00 ]

Acréscimo
[ R$ ] [ 0,00 ]

TOTAL                 R$ 9.500,00
```

Permitir alternar:

- percentual;
- valor.

O cálculo deve ficar centralizado no motor financeiro, não em componentes React isolados.

---

# 19. CONDIÇÕES DE PAGAMENTO

Selecionar:

### Opção 1
A combinar entre as partes.

### Opção 2
A cada duas semanas (até no máximo quinta-feira).

### Opção 3
30% entrada + 40% meio da obra + 30% na entrega.

### Opção 4
Personalizada.

Se personalizada:

```text
[ Digite a condição de pagamento... ]
```

---

# 20. PRAZO

Permitir:

- prazo estimado em dias;
- texto livre.

Exemplo:

```text
Prazo estimado:
[ 15 ] dias

Observação:
[ O prazo poderá variar de acordo com condições climáticas... ]
```

O prazo deve ser opcional no MVP se ainda não existir no domínio atual.

Não inventar cálculo automático de duração da obra.

---

# 21. VALIDADE

Padrão:

**30 dias**

Permitir alteração.

Mostrar:

```text
Proposta válida até:
07/11/2026
```

A data deve ser calculada a partir da data de emissão.

---

# 22. CLÁUSULA "SEM EMISSÃO DE NF"

Toggle:

```text
[ ] Sem emissão de NF
```

Se ativado, inserir a cláusula configurada pela empresa.

Não tratar isso como recurso fiscal.

---

# 23. RESUMO FINANCEIRO FIXO

No desktop:

painel lateral/sticky.

No mobile:

barra fixa inferior.

Exemplo:

```text
──────────────────────────────
Total da proposta

R$ 8.750,00

[ Revisar proposta ]
[ Gerar proposta ]
──────────────────────────────
```

O usuário nunca deve precisar voltar ao topo para descobrir o total.

---

# 24. REVISÃO ANTES DO ENVIO

Tela/modal de revisão:

## Cliente
Nome + contato.

## Imóvel
Endereço.

## Escopo

Área por área.

## Investimento

Subtotal → descontos/acréscimos → total.

## Condições

Pagamento, materiais, validade e demais cláusulas.

Botões:

- `Voltar e editar`
- `Gerar PDF`
- `Enviar pelo WhatsApp`

---

# 25. HISTÓRICO DE PROPOSTAS

Tela:

**Propostas**

Filtros:

- Todas;
- Rascunhos;
- Enviadas;
- Em negociação;
- Aprovadas;
- Recusadas;
- Expiradas.

Busca:

```text
[ 🔎 Nome do cliente, endereço ou número ]
```

Cada proposta deve apresentar:

```text
PROP-2026-0042
João da Silva
Rua Exemplo, 100
R$ 8.750,00

Enviada
06/10/2026
```

Ações:

- Visualizar;
- Editar;
- Duplicar;
- Gerar PDF;
- WhatsApp;
- Alterar status.

---

# 26. DUPLICAÇÃO

Duplicar proposta deve ser uma função de primeira classe.

Ao duplicar:

- criar novo ID;
- gerar novo número;
- resetar status para `RASCUNHO`;
- manter cliente se desejado;
- manter imóvel;
- manter escopo;
- manter condições;
- manter valores;
- permitir editar antes de salvar.

Nunca alterar a proposta original.

---

# 27. STATUS

Estados:

```text
RASCUNHO
ENVIADA
EM_NEGOCIACAO
APROVADA
RECUSADA
EXPIRADA
CANCELADA
```

Transições comuns:

```text
RASCUNHO → ENVIADA
ENVIADA → EM_NEGOCIACAO
ENVIADA → APROVADA
ENVIADA → RECUSADA
ENVIADA → EXPIRADA
```

Permitir alteração manual de status quando fizer sentido.

---

# 28. VERSIONAMENTO

Regra:

Se a proposta ainda é rascunho:

```text
editar normalmente
```

Se já foi enviada:

```text
alteração relevante
       ↓
nova versão
```

Exemplo:

```text
PROP-0042 v1
PROP-0042 v2
PROP-0042 v3
```

A proposta deve mostrar qual versão está ativa.

---

# 29. PDF

O PDF deve ser o documento formal.

Estrutura:

1. Logo;
2. Dados do prestador;
3. Título `PROPOSTA COMERCIAL`;
4. Número;
5. Data;
6. Validade;
7. Cliente;
8. Imóvel;
9. Objetivo;
10. Escopo dos serviços;
11. Áreas;
12. Etapas técnicas;
13. Acabamentos;
14. Investimento;
15. Condições de pagamento;
16. Fornecimento de materiais;
17. Observações;
18. Cláusulas;
19. Aceite;
20. Contatos.

O PDF deve usar a biblioteca já presente no projeto (`jspdf`/`jspdf-autotable`) salvo necessidade técnica comprovada de substituição.

---

# 30. WHATSAPP

A mensagem deve ser muito menor que o PDF.

Estrutura:

```text
Olá, [NOME]! Tudo bem?

Conforme nossa vistoria, segue a proposta para os serviços de pintura do imóvel em [ENDEREÇO].

Serviços:
• Paredes
• Tetos
• Portas

Investimento: R$ 8.750,00

Pagamento: [CONDIÇÃO]

Validade: [DATA]

Estou à disposição para qualquer dúvida.
```

Botões:

- `Copiar mensagem`;
- `Abrir WhatsApp`.

Não enviar automaticamente sem ação explícita do usuário.

---

# 31. PERFIL DO PRESTADOR

Tela:

**Dados da empresa / pintor**

Campos:

- Nome;
- Nome comercial;
- CPF/CNPJ;
- Telefone;
- WhatsApp;
- E-mail;
- Endereço;
- Logo;
- Texto institucional;
- Rodapé;
- Cor principal da proposta;
- Condições de pagamento padrão;
- Validade padrão;
- Texto de materiais;
- Cláusulas padrão.

Essas configurações devem alimentar automaticamente novas propostas.

---

# 32. TEMPLATE DE PROPOSTA

Permitir futuramente salvar combinações frequentes.

Exemplos:

- Pintura interna completa;
- Pintura externa;
- Pintura interna + externa;
- Pintura de casa completa;
- Fachada;
- Portas e madeiramentos;
- Estruturas metálicas.

O template deve armazenar o escopo inicial.

Não deve armazenar dados específicos do cliente.

---

# 33. MODELO DE DADOS FUNCIONAL

## Prestador

```text
id
nome
nomeComercial
documento
telefone
whatsapp
email
endereco
logo
configuracoes
```

## Cliente

```text
id
nome
documento
telefone
whatsapp
email
observacoes
```

## Imóvel

```text
id
clienteId
endereco
numero
complemento
bairro
cidade
estado
tipo
observacoes
```

## Proposta

```text
id
numero
versao
clienteId
imovelId
status
dataEmissao
validade
objetivo
pricingMode
supplyMode
subtotal
desconto
acrescimo
total
condicaoPagamento
prazo
observacoes
```

## Item da proposta

```text
id
propostaId
area
substrato
nome
quantidade
unidade
precoUnitario
subtotal
processoTecnico[]
acabamento
cor
observacoes
ordem
```

---

# 34. REGRAS IMPORTANTES DO DOMÍNIO

## Regra 1

Alterar uma proposta não altera o catálogo global.

## Regra 2

Alterar um template não altera propostas já criadas.

## Regra 3

Alterar o cliente não deve alterar snapshots de propostas já emitidas.

## Regra 4

Valores monetários devem ser tratados com precisão adequada.

## Regra 5

Nenhum cálculo financeiro crítico deve existir somente no frontend.

## Regra 6

Uma proposta emitida deve ser reproduzível posteriormente.

## Regra 7

A exclusão de uma proposta enviada deve ser tratada com cuidado para não destruir histórico comercial.

---

# 35. MOBILE-FIRST

O uso principal esperado é celular.

## Mobile

- cards empilhados;
- botões grandes;
- inputs fáceis de tocar;
- resumo financeiro fixo;
- ações principais na parte inferior;
- pouca navegação;
- modais que ocupem a tela quando necessário.

## Desktop

- painel de resumo lateral;
- formulário central;
- mais informações visíveis simultaneamente;
- atalhos e ações rápidas.

---

# 36. DESIGN SYSTEM

O repositório possui um `DESIGN.md` com uma linguagem visual originalmente inspirada em uma interface SaaS editorial, com canvas creme, tipografia forte, cards arredondados e componentes definidos.

Para o sistema de propostas:

**manter os tokens e a consistência técnica já existentes, mas priorizar a experiência operacional do produto.**

Não transformar o aplicativo em uma landing page.

A interface deve parecer:

- profissional;
- confiável;
- limpa;
- comercial;
- rápida;
- adequada para um empreiteiro trabalhando no celular.

Evitar excesso de:

- ilustrações;
- animações;
- cards decorativos;
- grandes espaços vazios;
- elementos que aumentem o número de toques.

O formulário de proposta é mais importante que a estética editorial.

---

# 37. COMPONENTES PRINCIPAIS

Estrutura conceitual:

```text
src/
├── components/
│   ├── proposals/
│   │   ├── ProposalForm
│   │   ├── CustomerSelector
│   │   ├── PropertySelector
│   │   ├── AreaScopeSelector
│   │   ├── ScopeEditor
│   │   ├── ScopeItem
│   │   ├── PricingPanel
│   │   ├── PaymentTerms
│   │   ├── ProposalReview
│   │   └── ProposalActions
│   │
│   ├── customers/
│   ├── properties/
│   ├── settings/
│   └── common/
│
├── data/
│   └── standardScopes
│
├── types/
│   ├── proposal
│   ├── customer
│   ├── property
│   └── scopeCatalog
│
├── utils/
│   ├── calculations
│   ├── whatsappGenerator
│   └── formatting
│
└── services/
    ├── storage
    ├── pdfGenerator
    └── api
```

Adaptar aos arquivos já existentes; não mover tudo sem necessidade.

---

# 38. API / SERVIDOR

Rotas conceituais:

```text
GET    /api/proposals
POST   /api/proposals
GET    /api/proposals/:id
PUT    /api/proposals/:id
DELETE /api/proposals/:id

POST   /api/proposals/:id/duplicate
POST   /api/proposals/:id/version

GET    /api/customers
POST   /api/customers
PUT    /api/customers/:id

GET    /api/properties
POST   /api/properties
PUT    /api/properties/:id

GET    /api/scope-catalog

GET    /api/settings/profile
PUT    /api/settings/profile
```

Não implementar todas as rotas se o armazenamento atual ainda for local. Primeiro alinhar a API à estratégia de persistência efetivamente utilizada pelo projeto.

---

# 39. PERSISTÊNCIA

O repositório atual deve ser inspecionado antes de qualquer migração.

Se a implementação atual utilizar:

- LocalStorage → preservar no MVP se a prioridade for funcionamento offline;
- Supabase → utilizar a implementação existente se já estiver funcional;
- API/PG → preservar se já estiver funcional.

A decisão deve ser baseada no código existente, não apenas no backlog antigo.

Caso exista migração de LocalStorage para backend, criar camada de repositório para impedir que os componentes React dependam diretamente da tecnologia de armazenamento.

Interface conceitual:

```ts
interface ProposalRepository {
  list(): Promise<Proposal[]>
  getById(id: string): Promise<Proposal | null>
  create(proposal: Proposal): Promise<Proposal>
  update(id: string, proposal: Proposal): Promise<Proposal>
  duplicate(id: string): Promise<Proposal>
  delete(id: string): Promise<void>
}
```

---

# 40. TESTES

O repositório já registra testes para:

- catálogo 3 níveis;
- herança;
- precificação híbrida;
- parcelamento;
- persistência;
- API;
- máscaras;
- assinatura/quotas.

Os próximos testes devem priorizar o comportamento funcional do Proposal Builder.

## Teste 1 — seleção de área

Selecionar Paredes deve gerar:

```text
ALVENARIA_INTERNA
+
processo de paredes
```

## Teste 2 — seleção múltipla

Paredes + Tetos + Portas devem manter processos independentes.

## Teste 3 — edição do processo

Remover uma etapa deve afetar somente a proposta.

## Teste 4 — preço por área

Somar corretamente os valores.

## Teste 5 — preço global

Não exigir valores individuais.

## Teste 6 — desconto

Validar percentual e valor.

## Teste 7 — condição 30/40/30

Validar distribuição:

```text
30%
40%
30%
```

## Teste 8 — somente mão de obra

Adicionar automaticamente o texto de materiais.

## Teste 9 — duplicação

Nunca alterar a proposta original.

## Teste 10 — PDF

O PDF deve conter os mesmos dados da proposta.

## Teste 11 — WhatsApp

A mensagem deve refletir o valor e condições atuais.

## Teste 12 — snapshot

Alterações posteriores não devem modificar proposta já emitida.

---

# 41. CRITÉRIOS DE ACEITE DO PROPOSAL BUILDER

A implementação será considerada correta quando um usuário conseguir:

1. Abrir `Nova proposta`.
2. Selecionar ou cadastrar cliente.
3. Selecionar ou cadastrar imóvel.
4. Selecionar uma ou várias áreas.
5. Receber automaticamente os processos técnicos.
6. Editar as etapas.
7. Informar quantidade/unidade quando necessário.
8. Definir acabamento/cor quando aplicável.
9. Escolher mão de obra ou mão de obra + material.
10. Definir valor por área ou global.
11. Aplicar desconto/acréscimo.
12. Escolher condição de pagamento.
13. Definir validade.
14. Revisar a proposta.
15. Gerar PDF.
16. Gerar mensagem para WhatsApp.
17. Salvar a proposta.
18. Encontrá-la no histórico.
19. Duplicá-la.
20. Alterar seu status.

Tudo isso deve funcionar sem que o usuário precise conhecer a estrutura interna de substratos e templates.

---

# 42. ROADMAP DE IMPLEMENTAÇÃO

## FASE 1 — Consolidar o que já existe

Antes de criar novos componentes:

1. Ler o código atual.
2. Identificar componentes já implementados.
3. Identificar modelos TypeScript.
4. Identificar o catálogo atual.
5. Identificar motor de cálculo.
6. Identificar persistência.
7. Identificar geração PDF.
8. Identificar WhatsApp.
9. Rodar testes.
10. Rodar build.

Não reimplementar funcionalidades que já estão funcionando.

## FASE 2 — Proposal Builder

Prioridade máxima:

- cliente;
- imóvel;
- seleção de áreas;
- escopo;
- edição;
- valores;
- condições;
- resumo.

## FASE 3 — Entregáveis

- revisão;
- PDF;
- WhatsApp;
- preview;
- download.

## FASE 4 — Histórico

- busca;
- filtros;
- status;
- duplicação;
- versionamento.

## FASE 5 — Configurações

- perfil;
- logo;
- identidade;
- cláusulas;
- padrões.

## FASE 6 — QA

- testes;
- mobile;
- PDF;
- cenários reais;
- regressão.

---

# 43. REGRAS PARA O AGENTE DE DESENVOLVIMENTO

Antes de modificar código:

1. Ler `PROJECT_CONTEXT.md`.
2. Ler `backlog.md`.
3. Ler `DESIGN.md`.
4. Ler `DECISION_LOG.md`.
5. Ler `current_task.md`.
6. Verificar código existente.
7. Rodar testes atuais.
8. Identificar o menor conjunto de arquivos necessário.

Não:

- recriar o projeto;
- substituir a stack sem justificativa;
- duplicar regras de negócio;
- criar uma segunda implementação do catálogo;
- colocar cálculos importantes diretamente nos componentes;
- modificar o template global quando estiver editando uma proposta;
- apagar funcionalidades existentes para simplificar a tarefa.

Sempre:

- reutilizar componentes existentes;
- centralizar regras de negócio;
- manter compatibilidade;
- testar antes e depois;
- documentar decisões relevantes.

---

# 44. PRIORIDADE DE IMPLEMENTAÇÃO

### P0 — Essencial

- Proposal Builder;
- catálogo técnico;
- precificação;
- cliente;
- imóvel;
- PDF;
- WhatsApp;
- persistência;
- histórico básico.

### P1 — Importante

- duplicação;
- status;
- configurações;
- templates;
- versionamento.

### P2 — Evolução

- dashboard;
- métricas de conversão;
- assinatura digital;
- envio automatizado;
- integração WhatsApp;
- gestão de obras;
- CRM;
- IA para auxiliar elaboração do escopo.

---

# 45. DEFINIÇÃO DO MVP

O MVP NÃO precisa ser um SaaS complexo.

O MVP precisa fazer uma coisa excepcionalmente bem:

> **Criar uma proposta de pintura profissional, rápida e correta.**

Fluxo mínimo:

```text
Nova proposta
    ↓
Cliente
    ↓
Imóvel
    ↓
Áreas
    ↓
Processos automáticos
    ↓
Valores
    ↓
Pagamento
    ↓
Revisão
    ↓
PDF + WhatsApp
```

Se esse fluxo estiver rápido, confiável e agradável no celular, o produto já possui valor comercial real.

<!-- GSD:project-end -->
