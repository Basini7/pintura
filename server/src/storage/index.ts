import { IRepository } from './repository.js';
import { JsonRepository } from './jsonRepository.js';
import { PostgresRepository } from './postgresRepository.js';
import { SupabaseRepository } from './supabaseRepository.js';

export * from './repository.js';
export * from './jsonRepository.js';
export * from './postgresRepository.js';
export * from './supabaseRepository.js';

let activeRepository: IRepository | null = null;

export async function createStorageRepository(): Promise<IRepository> {
  if (activeRepository) return activeRepository;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  // 1. Prioridade A: Conexão via Supabase JS SDK (HTTPS - super resiliente)
  if (supabaseUrl && supabaseKey) {
    try {
      console.log(`[Storage] Conectando ao Supabase via SDK (${supabaseUrl})...`);
      const supaRepo = new SupabaseRepository(supabaseUrl, supabaseKey);
      // Teste rápido de conectividade
      await supaRepo.listProposals();
      console.log('[Storage] Conectado ao Supabase com sucesso via SDK!');
      activeRepository = supaRepo;
      return supaRepo;
    } catch (error) {
      console.error('[Storage] Falha ao conectar ao Supabase via SDK:', error);
    }
  }

  // 2. Prioridade B: Conexão direta PostgreSQL (TCP Pool)
  if (connectionString && !connectionString.includes('sb_secret_')) {
    try {
      console.log('[Storage] Conectando ao banco de dados PostgreSQL / Supabase...');
      const pgRepo = new PostgresRepository(connectionString);
      await pgRepo.initSchema();
      console.log('[Storage] Conectado ao Supabase com sucesso via PostgreSQL Pool!');
      activeRepository = pgRepo;
      return pgRepo;
    } catch (error) {
      console.error('[Storage] Falha ao conectar ao PostgreSQL/Supabase:', error);
      console.warn('[Storage] Recorrendo ao armazenamento local JSON de contingência.');
    }
  }

  // 3. Fallback: Armazenamento local JSON
  console.log('[Storage] Utilizando armazenamento local JSON.');
  activeRepository = new JsonRepository();
  return activeRepository;
}
