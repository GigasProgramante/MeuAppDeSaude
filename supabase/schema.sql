-- ============================================================================
-- SCHEMA SQL DO SUPABASE — MeuAppDeSaude
-- Script idempotente: pode ser executado do zero ou sobre banco existente.
-- Copie e cole no SQL Editor do Supabase e clique em "Run".
-- ============================================================================

-- 1. Tabela de Perfis dos Pacientes
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text default '',
  "fotoUri" text,
  telefone text default '',
  "frequenciaAtividade" text,
  idade integer,
  peso numeric,
  altura numeric,
  sexo text,
  imc numeric,
  comorbidades text[],
  alergias text,
  termos_aceitos_em timestamptz,
  updated_at timestamptz default now()
);

alter table public.perfis add column if not exists termos_aceitos_em timestamptz;

-- 2. Tabela de Lembretes
create table if not exists public.lembretes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null default 'remedio',
  concluido boolean default false,
  horario text not null,
  "notificationId" text,
  notification_ids text[],
  periodicidade text default 'diaria',
  dias_semana integer[],
  doses_tomadas_por_data jsonb default '{}'::jsonb,
  "nomeRemedio" text,
  frequencia text,
  observacoes text,
  "tipoAcao" text,
  "acaoPersonalizada" text,
  consulta_local text,
  consulta_especialidade text,
  consulta_preparo text,
  fisio_local text,
  fisio_terapeuta text,
  fisio_orientacoes text,
  created_at timestamptz default now()
);

alter table public.lembretes add column if not exists periodicidade text default 'diaria';
alter table public.lembretes add column if not exists dias_semana integer[];
alter table public.lembretes add column if not exists notification_ids text[];
alter table public.lembretes add column if not exists doses_tomadas_por_data jsonb default '{}'::jsonb;
alter table public.lembretes add column if not exists consulta_local text;
alter table public.lembretes add column if not exists consulta_especialidade text;
alter table public.lembretes add column if not exists consulta_preparo text;
alter table public.lembretes add column if not exists fisio_local text;
alter table public.lembretes add column if not exists fisio_terapeuta text;
alter table public.lembretes add column if not exists fisio_orientacoes text;

-- 3. Tabela de Medicamentos (Farmácia / Estoque)
create table if not exists public.medicamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  dosagem text not null,
  forma text not null,
  estoque text not null,
  prescritor text,
  validade text,
  armazenamento text,
  descontinuado boolean default false,
  "dataInicio" text,
  "dataTermino" text,
  created_at timestamptz default now()
);

-- 4. Tabela de Sinais Vitais
create table if not exists public.sinais_vitais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bpm text,
  glicose text,
  "glicoseTipo" text,
  pressao text,
  oxigenacao text,
  temperatura text,
  humor text,
  exercicio boolean,
  data timestamptz default now()
);

-- 5. Tabela de Histórico de Humor (Psicologia)
create table if not exists public.humor_historico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  "moodId" text not null,
  activity text,
  anotacao text,
  "horasSono" text,
  "qualidadeSono" text,
  data timestamptz default now()
);

alter table public.humor_historico add column if not exists anotacao text;
alter table public.humor_historico add column if not exists "horasSono" text;
alter table public.humor_historico add column if not exists "qualidadeSono" text;

-- 6. Tabela de Avaliações Psicológicas (PHQ-9 / GAD-7)
create table if not exists public.avaliacoes_psicologia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  pontuacao integer not null,
  "maxPontuacao" integer not null,
  classificacao text not null,
  orientacao text,
  "alertaCritico" boolean default false,
  data timestamptz default now()
);

-- 7. Tabela de Treinos (Educação Física)
create table if not exists public.treinos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  "duracaoMinutos" integer,
  intensidade text,
  "caloriasEstimadas" integer,
  data timestamptz default now()
);

-- 8. Tabela de Histórico de Dor (Fisioterapia)
create table if not exists public.historico_dor (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nivel integer not null check (nivel >= 0 and nivel <= 10),
  regiao text,
  tipo text,
  data timestamptz default now()
);

alter table public.historico_dor add column if not exists regiao text;
alter table public.historico_dor add column if not exists tipo text;

-- 9. Tabela de Histórico de Peso / IMC
create table if not exists public.historico_imc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  peso numeric not null,
  imc numeric,
  data timestamptz default now()
);

-- 10. Tabela de Checklist Diário de Cuidados (Enfermagem)
create table if not exists public.checklist_cuidados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data text not null,
  itens_concluidos text[] not null default '{}',
  updated_at timestamptz default now(),
  unique (user_id, data)
);

-- ============================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS) - LGPD
-- Cada paciente autenticado só pode ler, inserir, editar ou excluir os próprios dados
-- ============================================================================
alter table public.perfis enable row level security;
alter table public.lembretes enable row level security;
alter table public.medicamentos enable row level security;
alter table public.sinais_vitais enable row level security;
alter table public.humor_historico enable row level security;
alter table public.avaliacoes_psicologia enable row level security;
alter table public.treinos enable row level security;
alter table public.historico_dor enable row level security;
alter table public.historico_imc enable row level security;
alter table public.checklist_cuidados enable row level security;

drop policy if exists "Paciente gerencia proprio perfil" on public.perfis;
create policy "Paciente gerencia proprio perfil" on public.perfis
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Paciente gerencia proprios lembretes" on public.lembretes;
create policy "Paciente gerencia proprios lembretes" on public.lembretes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprios medicamentos" on public.medicamentos;
create policy "Paciente gerencia proprios medicamentos" on public.medicamentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprios sinais vitais" on public.sinais_vitais;
create policy "Paciente gerencia proprios sinais vitais" on public.sinais_vitais
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprio humor" on public.humor_historico;
create policy "Paciente gerencia proprio humor" on public.humor_historico
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprias avaliacoes" on public.avaliacoes_psicologia;
create policy "Paciente gerencia proprias avaliacoes" on public.avaliacoes_psicologia
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprios treinos" on public.treinos;
create policy "Paciente gerencia proprios treinos" on public.treinos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprio historico de dor" on public.historico_dor;
create policy "Paciente gerencia proprio historico de dor" on public.historico_dor
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprio historico imc" on public.historico_imc;
create policy "Paciente gerencia proprio historico imc" on public.historico_imc
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Paciente gerencia proprio checklist cuidados" on public.checklist_cuidados;
create policy "Paciente gerencia proprio checklist cuidados" on public.checklist_cuidados
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET PARA FOTOS DE PERFIL (avatars)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Usuario envia proprio avatar" on storage.objects;
create policy "Usuario envia proprio avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuario atualiza proprio avatar" on storage.objects;
create policy "Usuario atualiza proprio avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuario remove proprio avatar" on storage.objects;
create policy "Usuario remove proprio avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatars sao visiveis" on storage.objects;
create policy "Avatars sao visiveis" on storage.objects
  for select using (bucket_id = 'avatars');
