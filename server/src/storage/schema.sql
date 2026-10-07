-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS - PROPOSTA DO PINTOR (SUPABASE / POSTGRESQL)
-- Execute este script no SQL Editor do seu projeto Supabase para criar as tabelas.
-- ==============================================================================

-- 1. Tabela de Usuários (Pintores cadastrados)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- 2. Tabela de Sessões (Tokens de autenticação seguros)
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 3. Tabela de Perfis Comerciais (Dados da empresa/pintor para o cabeçalho do PDF)
CREATE TABLE IF NOT EXISTS profiles (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phones TEXT[] NOT NULL DEFAULT '{}',
  address TEXT DEFAULT '',
  pix_key VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Propostas / Orçamentos
CREATE TABLE IF NOT EXISTS proposals (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_token VARCHAR(128) UNIQUE,
  proposal_number VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  client JSONB NOT NULL DEFAULT '{}'::jsonb,
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  view_count INT NOT NULL DEFAULT 0,
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  signer_name VARCHAR(255),
  signature TEXT,
  signer_ip VARCHAR(128),
  signer_user_agent TEXT,
  signed_content_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS public_token VARCHAR(128);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_ip VARCHAR(128);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signed_content_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_public_token ON proposals(public_token) WHERE public_token IS NOT NULL;

-- 5. Tabela de Assinaturas (Planos Básico, Intermediário e Pro)
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(32) NOT NULL DEFAULT 'free',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  current_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabela de Compras Pendentes da Kiwify (Se o pintor pagou antes de se cadastrar)
CREATE TABLE IF NOT EXISTS pending_upgrades (
  email VARCHAR(255) PRIMARY KEY,
  plan_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_upgrades ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id VARCHAR(128) PRIMARY KEY,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Fim do Schema
-- ==============================================================================
