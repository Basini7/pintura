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
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const production = process.env.NODE_ENV === 'production';

  if (production) {
    const requiredPaymentConfig = [
      'KIWIFY_WEBHOOK_SECRET',
      'KIWIFY_PRODUCT_ID_BASIC',
      'KIWIFY_PRODUCT_ID_INTERMEDIATE',
      'KIWIFY_PRODUCT_ID_PRO',
    ];
    const missingPaymentConfig = requiredPaymentConfig.filter((key) => !process.env[key]);
    if (missingPaymentConfig.length) {
      throw new Error(`Configuração obrigatória ausente: ${missingPaymentConfig.join(', ')}`);
    }

    const backend = process.env.STORAGE_BACKEND;
    if (backend === 'supabase') {
      if (!supabaseUrl || !supabaseKey) throw new Error('Supabase exige SUPABASE_URL e SUPABASE_SECRET_KEY.');
      const repository = new SupabaseRepository(supabaseUrl, supabaseKey);
      await repository.checkConnection();
      activeRepository = repository;
      return repository;
    }
    if (backend === 'postgres') {
      if (!connectionString || connectionString.includes('sb_secret_')) {
        throw new Error('Postgres exige DATABASE_URL ou SUPABASE_DB_URL válido.');
      }
      const repository = new PostgresRepository(connectionString);
      await repository.initSchema();
      activeRepository = repository;
      return repository;
    }
    throw new Error('Em produção, STORAGE_BACKEND deve ser explicitamente supabase ou postgres.');
  }

  // 1. Prioridade A: Conexão via Supabase JS SDK (HTTPS - super resiliente)
  if (supabaseUrl && supabaseKey) {
    try {
      console.log(`[Storage] Conectando ao Supabase via SDK (${supabaseUrl})...`);
      const supaRepo = new SupabaseRepository(supabaseUrl, supabaseKey);
      // Teste rápido de conectividade
      await supaRepo.checkConnection();
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

  // JSON permanece disponível apenas fora da produção.
  console.log('[Storage] Utilizando armazenamento local JSON.');
  activeRepository = new JsonRepository();
  return activeRepository;
}
