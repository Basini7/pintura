import 'dotenv/config';
import { createApp } from './app.js';
import { createStorageRepository } from './storage/index.js';

async function bootstrap() {
  const repository = await createStorageRepository();
  const app = createApp(repository);
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`[Servidor de Pintura] Rodando na porta ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Servidor de Pintura] Erro fatal na inicialização:', err);
  process.exit(1);
});

