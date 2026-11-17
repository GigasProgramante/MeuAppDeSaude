# Meu App de Saúde (Health Tracker — UNC)

Aplicativo móvel e web *offline-first* desenvolvido em **React Native + Expo + TypeScript** como **projeto de curricularização da extensão** do curso de Engenharia de Software da **Universidade do Contestado (UNC)** em parceria com os cursos da área da Saúde (**Psicologia, Enfermagem, Farmácia, Educação Física, Fisioterapia, Medicina e Odontologia**), para apoiar pacientes no acompanhamento diário de saúde e divulgar os serviços prestados pelas Clínicas-Escola da UNC à comunidade.

> **Aviso institucional:** O aplicativo é uma ferramenta de autocuidado e apoio educativo em saúde. Ele não realiza diagnósticos, não substitui prontuário oficial médico e não substitui atendimento presencial nem serviços de emergência.

---

## Tecnologias e Arquitetura

- **React Native (`0.81.5`) & Expo (SDK `54`) + React (`19.1.0`):** Suporte multiplataforma para Android, iOS e Expo Web.
- **TypeScript (`strict: true`):** Tipagem estática ponta a ponta em [`src/types/index.ts`](src/types/index.ts).
- **Design System Interno & Acessibilidade:** Tokens visuais em [`src/theme/tokens.ts`](src/theme/tokens.ts) e 13 componentes reutilizáveis em [`src/components/ui/`](src/components/ui/index.ts) (`ScreenShell`, `AppCard`, `AppButton`, `AppInput`, `ChipSelector`, `SegmentedTabs`, `StatusBadge`, `AppModal`, `EmptyState`, `FeedbackProvider`, `StepperInput`, `PainScaleSelector`, `PresetRemindersCard`), com tipografia mínima de `13 px`, alvos de toque `>= 44 px`, ícones exclusivos via `@expo/vector-icons` e largura responsiva para Web (`680 px` / `960 px`).
- **Zustand + AsyncStorage Isolado por Contexto (`src/store/useStore.ts`):** Persistência local *offline-first* com IDs UUID v4 via `expo-crypto`, isolamento de dados entre modo visitante (`guest`) e contas autenticadas (`userId`), e fila de sincronização offline em [`src/services/sync.ts`](src/services/sync.ts).
- **Supabase (`@supabase/supabase-js`) & LGPD:** Cliente opcional em [`src/services/supabase.ts`](src/services/supabase.ts), conversores UI ↔ banco em [`src/services/mappers.ts`](src/services/mappers.ts), operações CRUD + Realtime + upload de avatar (`arrayBuffer`) em [`src/services/db.ts`](src/services/db.ts), script idempotente em [`supabase/schema.sql`](supabase/schema.sql) com Row Level Security (RLS) e Edge Function [`supabase/functions/delete-account/index.ts`](supabase/functions/delete-account/index.ts) para exclusão definitiva da conta e dados.
- **Regras Clínicas, Gráficos e PDF:** Helpers puros testados em [`src/services/clinicaHelpers.ts`](src/services/clinicaHelpers.ts), gráficos em [`src/components/ClinicaCharts.tsx`](src/components/ClinicaCharts.tsx) e geração de prontuário clínico consolidado em PDF em [`src/services/prontuarioPdf.ts`](src/services/prontuarioPdf.ts).
- **Recursos Nativos Expo & CI:** `expo-notifications`, `expo-location` (GPS), `expo-print`, `expo-sharing`, `expo-image-picker`, `expo-auth-session`, `expo-web-browser` e pipeline CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Como Instalar e Rodar

### Pré-requisitos
- **Node.js** `>= 20` e **npm**
- Aplicativo **Expo Go** ou build nativo (para testes em Android/iOS)

### Passo a passo
```bash
# 1. Clonar o repositório
git clone https://github.com/bonasticos/MeuAppDeSaude.git
cd MeuAppDeSaude

# 2. Instalar dependências
npm install

# 3. (Opcional) Configurar variáveis de ambiente para Supabase e Google OAuth
cp .env.example .env
# Preencha EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY e EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
```

> **Modo local / offline (sem `.env`):** O aplicativo abre e funciona integralmente sem variáveis de ambiente por meio do botão **Entrar sem Login (Acesso Rápido)** (dados mantidos apenas no aparelho). Em ambiente de desenvolvimento (`__DEV__`), também é aceito o usuário de demonstração `admin` / `admin`.

### Comandos úteis
```bash
# Iniciar servidor Expo (QR Code para Android/iOS)
npm start

# Abrir no navegador (Expo Web)
npm run web

# Validar tipagem TypeScript
npx tsc --noEmit

# Executar suíte de testes automatizados (Jest — 6 suítes / 54 testes)
npm test

# Gerar bundle de produção Web para verificação
npx expo export --platform web
```

### Configuração da Nuvem (Supabase — Passos Manuais)
1. Crie um projeto no painel do **Supabase** e copie a URL e a `anon key` para o seu `.env` local (baseado em [`.env.example`](.env.example)).
2. Execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) no **SQL Editor** do Supabase (script idempotente: cria tabelas, colunas, RLS e políticas do bucket `avatars`).
3. Configure as **Redirect URLs** no Supabase Auth incluindo `meuappdesaude://redefinir-senha` e o domínio Web utilizado.
4. Faça o deploy da Edge Function de exclusão LGPD com a Supabase CLI (mantendo `SUPABASE_SERVICE_ROLE_KEY` somente no servidor):
   ```bash
   supabase functions deploy delete-account
   ```

---

## Estrutura do Projeto

```text
.github/workflows/ci.yml          # Pipeline CI: npm ci, npx tsc --noEmit e npm test -- --ci
src/
├── components/
│   ├── ClinicaCharts.tsx         # Gráficos em barras acessíveis integrados aos tokens do Design System
│   └── ui/                       # ScreenShell, AppCard, AppButton, AppInput, ChipSelector, SegmentedTabs,
│                                 # StatusBadge, AppModal, EmptyState, FeedbackProvider, StepperInput, PainScaleSelector, PresetRemindersCard
├── navigation/
│   └── AppNavigator.tsx          # Rotas tipadas, sessão Supabase, deep links (PASSWORD_RECOVERY) e flush em AppState
├── screens/
│   ├── Login/                    # E-mail/senha, toggle olho, Google OAuth, recuperação de senha, __DEV__ admin e Acesso Rápido
│   ├── Cadastro/                 # Cadastro com validação de e-mail, máscara de telefone, força de senha e checkbox LGPD
│   ├── RedefinirSenha/           # Definição de nova senha via deep link de recuperação (updateUser)
│   ├── Inicial/                  # Saudação com data, alertas de alergia/estoque, "Resumo de Hoje" e grid das áreas
│   ├── Configuracoes/            # Meus Dados (avatar Storage), Segurança/LGPD (troca de senha e exclusão dupla) e sessão
│   ├── Humor/                    # Psicologia: SOS no header, respiração 4-7-8 & grounding, sono, diário, PHQ-9/GAD-7 (gráfico) e lembretes
│   ├── SinaisVitais/             # Enfermagem: guia de medição, contexto da aferição, checklist, Carteirinha de Vacinas e lembretes
│   ├── Lembretes/                # Farmácia & Agenda: alarmes, busca/filtro de estoque, adesão semanal, PDF e lembretes sugeridos
│   ├── Perfil/                   # Corpo & Movimento em 3 abas: Perfil & Saúde (copos de água por data), Ed. Física, Fisioterapia & Dor
│   ├── Fisioterapia/             # Rota alias para a aba Fisioterapia & Dor + modais Exercícios de Hoje e Lembretes de Postura
│   └── SobreUNC/                 # Clínicas-Escola da UNC, checklist "O que levar na consulta", prontuário PDF, contatos e GPS
├── services/
│   ├── authRecovery.ts           # Redirect URL, parser de tokens de recuperação, força de senha e máscara de telefone (+ testes)
│   ├── clinicaHelpers.ts         # IMC contínuo, meta semanal, baixa diária de estoque, validade, adesão semanal e máscara BR (+ testes)
│   ├── db.ts                     # CRUD completo nas tabelas Supabase (incluindo vacinas), Realtime e upload de avatar com arrayBuffer
│   ├── lembretesPresets.ts       # Sugestões diárias de autocuidado para pessoas idosas por área de saúde
│   ├── mappers.ts                # Conversão bidirecional segura UI ↔ banco de todas as entidades (+ testes)
│   ├── notifications.ts          # Serviço centralizado de notificações locais e periodicidades (+ testes)
│   ├── prontuarioPdf.ts          # Geração HTML com escape seguro e exportação em PDF do prontuário completo (+ testes)
│   ├── supabase.ts               # Cliente Supabase com detecção segura de ambiente sem .env
│   └── sync.ts                   # Fila offline-first em AsyncStorage, hidratação e isolamento de contextos (+ testes)
├── store/
│   └── useStore.ts               # Zustand + UUID v4 + isolamento guest/userId e sincronização com a nuvem
├── theme/
│   └── tokens.ts                 # Paleta institucional UNC, tipografia >= 13px, espaçamentos, raios e sombras
└── types/
    └── index.ts                  # Interfaces TypeScript do domínio clínico
supabase/
├── schema.sql                    # Schema PostgreSQL idempotente, RLS por auth.uid() e bucket Storage 'avatars'
└── functions/
    └── delete-account/index.ts   # Edge Function Deno para exclusão definitiva LGPD (JWT + service_role no servidor)
```

---

## Telas e Funcionalidades Implementadas

1. **Login (`src/screens/Login`), Cadastro (`src/screens/Cadastro`) e Redefinição de Senha (`src/screens/RedefinirSenha`)**
   - Autenticação com e-mail e senha (validação alinhada com o rótulo `E-mail *`), botão mostrar/ocultar senha, indicador de força de senha e máscara de telefone.
   - Recuperação de senha por e-mail com deep link para `RedefinirSenha`, Google OAuth configurável via `.env`, acesso `admin/admin` restrito a `__DEV__` e **Acesso Rápido** local com aviso explícito de armazenamento no aparelho.
   - Aceite obrigatório dos **Termos de Uso e Política de Privacidade (LGPD)** gravando `termosAceitosEm`.

2. **Inicial (`src/screens/Inicial`)**
   - Saudação personalizada com data por extenso, indicador de modo local (quando visitante), alertas prioritários (alergias registradas, estoque baixo ou vencimento), faixa **Resumo de Hoje** clicável (próximo alarme, último sinal vital, humor e treinos/dor), grid responsivo das 4 áreas de cuidado e acesso às **Clínicas-Escola da UNC**.

3. **Configurações (`src/screens/Configuracoes`)**
   - Organizada em 3 blocos: **Meus Dados** (edição de nome, telefone e avatar via galeria/Supabase Storage), **Segurança e Privacidade** (troca de senha logado, envio de e-mail de recuperação e exclusão definitiva de conta/dados LGPD com dupla confirmação digitando `EXCLUIR`) e **Institucional e Sessão**.

4. **Saúde Mental — Psicologia (`src/screens/Humor`)**
   - Botão de emergência **Preciso de ajuda** fixo no header abrindo contatos clicáveis (`tel:`) do CVV (`188`), SAMU (`192`), CAPS (`136`) e Clínica-Escola UNC.
   - Card **"Precisa desacelerar?"** com modal interativo de **Respiração Guiada** (`4-7-8` e `Diafragmática`) e checklist sensorial **Grounding 5-4-3-2-1**.
   - Registro diário com botão salvar bloqueado até seleção de humor, registro de horas/qualidade do sono e diário sempre visíveis, questionários **PHQ-9** e **GAD-7** com barra de progresso, **gráfico evolutivo de escores PHQ-9 (`0–27`) e GAD-7 (`0–21`)**, linha do tempo com filtros (`Todos`, `Humor`, `Triagens`, `Sinais Vitais`) e lembretes diários recomendados (higiene do sono, respiração calma e banho de sol/conversa).

5. **Sinais Vitais & Vacinas — Enfermagem (`src/screens/SinaisVitais`)**
   - Controles `StepperInput` (`−` campo `+`) para FC (bpm), Glicemia (com tipo obrigatório), Pressão Arterial Sistólica/Diastólica (faixa única `100–130 mmHg` unificada entre alerta, feedback e gráfico), SpO₂ e Temperatura Corporal (°C), **contexto opcional da medição** e modal educativo **"Como Medir Corretamente em Casa"** (PA e glicemia).
   - Checklist diário de cuidados (`X/6`), gráfico interativo por métrica, **Mini Carteirinha de Vacinas** (cadastro e histórico integrados ao Supabase e ao Prontuário PDF), edição/exclusão com confirmação via `FeedbackProvider` e lembretes sugeridos para aferição e cuidados preventivos.

6. **Lembretes & Farmácia (`src/screens/Lembretes`)**
   - Abas **Alarmes** e **Estoque Farmácia**, adesão diária no topo, **resumo de adesão semanal dos últimos 7 dias**, máscaras automáticas `HH:MM` e `MM/AAAA`, preservação de periodicidade (`diaria`, `semanal`, `dias_especificos`) ao editar, campos estruturados para lembretes de consulta/fisioterapia, baixa diária única (`-1` unidade sem duplicação via `dosesTomadasPorData`/`dosesBaixadasPorData`) e lembretes sugeridos (controle de açúcar e doces após refeições, conferência de estoque e tomada com água).
   - Controle de estoque com **busca por nome e filtros de status (`Todos`, `Estoque baixo`, `Vencendo / Vencidos`)**, alertas de estoque baixo (`<= 5`), validade (vencido/próximo), histórico de descontinuados e exportação de **PDF do Estoque** ou **Prontuário Clínico Completo (PDF)**.

7. **Corpo & Movimento — Perfil, Ed. Física e Fisioterapia (`src/screens/Perfil` e `src/screens/Fisioterapia`)**
   - Tela unificada em 3 abas (**Perfil & Saúde**, **Educação Física**, **Fisioterapia & Dor**) com a rota `Fisioterapia` mantida como alias direto.
   - Destaque de alergias no topo, IMC contínuo (sem lacunas nas fronteiras `25.0`/`30.0`) com barra visual de faixas da OMS, meta diária de água (`35 ml × peso`) com **controle interativo de copos bebidos no dia persistido por data** (`- 1 copo` / `+ 1 copo (250 ml)` e seleção por copo), meta semanal real (segunda a domingo), biblioteca de exercícios filtrada por comorbidades com aviso de liberação médica, escala de dor **EVA `0–10`** tátil, modais funcionais para **Exercícios Terapêuticos de Hoje** / **Lembretes de Postura e Sessões** e lembretes sugeridos de hidratação e pausa ativa.

8. **Serviços da UNC à Comunidade (`src/screens/SobreUNC`)**
   - Informações das Clínicas-Escola (Medicina, Fisioterapia, Odontologia, Psicologia, Enfermagem e Espaço Mais Saúde), agendamento, cálculo de distância/rotas por GPS (`expo-location`), **checklist interativo "O que levar na consulta (SUS / UNC)"**, atalho direto para **Gerar Prontuário PDF do App para Consulta**, e telefones de Fisioterapia e Enfermagem marcados com `// TODO: confirmar com a UNC` em [`src/screens/SobreUNC/uncData.ts`](src/screens/SobreUNC/uncData.ts).

---

## Roadmap e Gestão no GitHub Projects

O acompanhamento das turmas é organizado no GitHub Project [**MeuAppDeSaude - Fases 1a a 6a**](https://github.com/orgs/bonasticos/projects/1) com classificação explícita de **Dificuldade** alinhada às fases:
- **6ª Fase (`Dificil`):** Arquitetura, Design System, sync offline-first, mappers, UUIDs, Auth/LGPD, Edge Function, CI/testes e deploy em nuvem.
- **4ª Fase (`Media`):** Regras clínicas, unificação Corpo & Movimento em 3 abas, prontuário PDF, questionários/gráficos e validações multiplataforma.
- **2ª Fase (`Facil`):** Modais clínicos, redesign acessível, remoção de emojis estruturais/`RFxx`, máscaras de formulário e revisão de contatos UNC.

### Pendências manuais abertas no board
- [ ] **[6ª Fase · Difícil]** Provisionar projeto no painel do Supabase, executar `supabase/schema.sql` e preencher `.env` ([#22](https://github.com/bonasticos/MeuAppDeSaude/issues/22)).
- [ ] **[6ª Fase · Difícil]** Fazer deploy da Edge Function `delete-account`, configurar Redirect URLs e validar fluxo E2E no Supabase real ([#45](https://github.com/bonasticos/MeuAppDeSaude/issues/45)).
- [ ] **[4ª Fase · Média]** Validar app em dispositivos físicos (Android/iOS) e viewports Web responsivos `375 / 768 / 1280 px` ([#49](https://github.com/bonasticos/MeuAppDeSaude/issues/49)).
- [ ] **[2ª Fase · Fácil]** Confirmar telefones oficiais de Fisioterapia e Enfermagem junto às coordenações da UNC ([#53](https://github.com/bonasticos/MeuAppDeSaude/issues/53)).

Consulte também [`REQUISITOS.md`](REQUISITOS.md) para o detalhamento dos requisitos de domínio.

---

## Guia de Contribuição

1. Crie uma branch dedicada (`feature/`, `fix/`, `docs/`, `refactor/`, `chore/`) a partir da `master`.
2. Use **Conventional Commits** (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`).
3. Vincule a issue no PR (`Closes #X`) e execute `npx tsc --noEmit` e `npm test` antes de abrir o Pull Request.
4. **Nunca** commite `.env`, credenciais reais ou chaves `service_role`.
