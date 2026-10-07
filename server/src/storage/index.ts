import { IRepository } from './repository.js';
import { JsonRepository } from './jsonRepository.js';
import { PostgresRepository } from './postgresRepository.js';

export * from './repository.js';
export * from './jsonRepository.js';
export * from './postgresRepository.js';

let activeRepository: IRepository | null = null;

export async function createStorageRepository(): Promise<IRepository> {
  if (activeRepository) return activeRepository;

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (connectionString) {
    try {
      console.log('[Storage] Conectando ao banco de dados PostgreSQL / Supabase...');
      const pgRepo = new PostgresRepository(connectionString);
      await pgRepo.initSchema();
      console.log('[Storage] Conectado ao Supabase com sucesso! Tabelas verificadas/criadas.');
      activeRepository = pgRepo;
      return pgRepo;
    } catch (error) {
      console.error('[Storage] Falha ao conectar ao PostgreSQL/Supabase:', error);
      console.warn('[Storage] Recorrendo ao armazenamento local JSON de contingência.');
    }
  } else {
    console.log('[Storage] DATABASE_URL não definida. Utilizando armazenamento local JSON.');
  }

  activeRepository = new JsonRepository();
  return activeRepository;
}
