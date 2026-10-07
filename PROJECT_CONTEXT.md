# PROJECT CONTEXT — Sistema de Propostas Comerciais (Pintura Residencial)

## 1. ESTADO ATUAL DO SISTEMA
- **Fase:** PLANNING Concluído com Sucesso / Transição para IMPLEMENTATION
- **Agentes:** AGENT_ARCHITECT -> AGENT_PLANNER -> AGENT_DEVELOPER
- **Data:** 2026-10-06

---

## 2. ARQUITETURA DE DOMÍNIO — HIERARQUIA EM CADEIA DE ESCOPO

### 2.1. Nível 1: Macro-Categorias / Substratos
1. `ALVENARIA_INTERNA`
2. `ALVENARIA_EXTERNA`
3. `MADEIRAMENTOS`
4. `METALICOS`

---

### 2.2. Nível 2: Processos Técnicos Padrões por Substrato (Templates de Execução)

#### 1. ALVENARIA INTERNA
- **Etapas Padrão:**
  1. Forração e proteção com lona e/ou papelão dos pisos e áreas não pintáveis.
  2. Aplicação de seladora.
  3. Aplicação de massa corrida (02 demãos para tetos / correções pontuais para paredes).
  4. Lixamento técnico para regularização da superfície.
  5. Pintura de acabamento com 02 a 03 demãos de tinta na cor escolhida.

#### 2. ALVENARIA EXTERNA
- **Etapas Padrão:**
  1. Forração e proteção dos pisos e objetos não pintáveis com lona e/ou papelão.
  2. Preparação de limpeza: `Limpeza simples` OU `Lavagem por hidrojateamento`.
  3. Aplicação de 01 demão de Fundo Preparador de Paredes (aglutinador de partículas).
  4. Aplicação de 02 demãos de Selador Acrílico.
  5. Acabamento:
     - `Pintura Acrílica` OU
     - `Textura Acrílica`:
       - Tipo Cristal
       - Tipo Granfino Hidro-repelente
       - Tipo Outra (campo texto aberto para especificação do usuário)
  6. *Opcional:* Tratamento e revitalização de cimento queimado com lixamento e hidrofugante.

#### 3. MADEIRAMENTOS
- **Etapas Padrão:**
  1. Lixamento técnico e limpeza da madeira.
  2. Correção de pequenas imperfeições com massa para madeira.
  3. Acabamento:
     - Opção A: `Aplicação de Verniz` (brilhante/acetinado/fosco/stain) OU
     - Opção B: `Pintura com Tinta Esmalte Sintético` na cor desejada.

#### 4. METÁLICOS
- **Etapas Padrão:**
  1. Lixamento mecânico/manual e limpeza da superfície ferrosa.
  2. Aplicação de Convertedor de Ferrugem (onde for necessário).
  3. Aplicação de Fundo Sintético (primer anticorrosivo).
  4. Pintura de proteção e acabamento com Tinta Esmalte Sintético na cor desejada.

---

### 2.3. Nível 3: Mapeamento de Áreas de Trabalho para Substratos

| Área de Trabalho (Seleção do Usuário) | Substrato Herdado (Nível 1) | Processo Injetado Automaticamente (Nível 2) |
| :--- | :--- | :--- |
| **Paredes** | `ALVENARIA_INTERNA` | Proteção + Seladora + Massa corrida + Lixamento + Tinta (2-3 demãos) |
| **Tetos** | `ALVENARIA_INTERNA` | Proteção + Seladora + Massa corrida (2 demãos) + Lixamento + Tinta (2 demãos) |
| **Fachada Externa** | `ALVENARIA_EXTERNA` | Forração + Limpeza/Hidrojateamento + Fundo prep. + Selador acrílico + Pintura/Textura (Cristal, Granfino, Outra) |
| **Muros** | `ALVENARIA_EXTERNA` | Forração + Limpeza/Hidrojateamento + Fundo prep. + Selador acrílico + Pintura/Textura |
| **Portas** | `MADEIRAMENTOS` | Lixamento + Correção massa madeira + Verniz OU Esmalte Sintético |
| **Forros de madeira** | `MADEIRAMENTOS` | Lixamento + Correção imperfeições + Verniz OU Esmalte |
| **Testeiras** | `MADEIRAMENTOS` | Lixamento + Correção imperfeições + Verniz OU Esmalte |
| **Rufos** | `METALICOS` | Lixamento + Convertedor ferrugem + Fundo sintético + Esmalte sintético |
| **Calhas** | `METALICOS` | Lixamento + Convertedor ferrugem + Fundo sintético + Esmalte sintético |
| **Grades** | `METALICOS` | Lixamento + Convertedor ferrugem + Fundo sintético + Esmalte sintético |
| **Portão** | `METALICOS` | Lixamento + Convertedor ferrugem + Fundo sintético + Esmalte sintético |

---

### 2.4. Regras Financeiras e Condições Comerciais Aprovadas
1. **Modo de Precificação Híbrido:**
   - Permite informar valor individual por área de trabalho (com somatório automático);
   - OU informar diretamente o valor global fechado da obra.
2. **Escopo de Fornecimento:**
   - Comutador: `Apenas Mão de Obra` (com observação automática "Materiais por conta do contratante") vs `Mão de Obra + Material`.
3. **Condições de Pagamento Padrão:**
   - "A combinar entre as partes";
   - "A cada duas semanas (até no máximo quinta-feira)";
   - "30% entrada + 40% meio da obra + 30% na entrega";
   - Campo livre para condição customizada.
4. **Cláusulas Padrão:**
   - "Sem emissão de NF" (opcional/toggle);
   - "Validade da proposta: 30 dias" (configurável).

---

### 2.5. Arquitetura Técnica Consolidada
- **Backend:** Node.js + TypeScript + Express + Vitest. Catálogo de domínio, regras financeiras, persistência e API REST.
- **Frontend:** React + Vite + Tailwind CSS + Lucide Icons. Mobile-first para preenchimento ágil na visita técnica.
- **Saídas:** PDF Formal clássico para impressão/envio + Gerador de texto pronto para WhatsApp.
