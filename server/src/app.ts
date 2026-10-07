import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { IRepository } from './storage/repository.js';
import { JsonRepository } from './storage/jsonRepository.js';
import { createApiRouter } from './routes/api.js';

export function createApp(customRepository?: IRepository) {
  const app = express();
  const repository = customRepository || new JsonRepository();

  // 1. Cabeçalhos de Segurança HTTP (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Compatível com SPAs dinâmicos, Vite e assinaturas em Base64
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Restrição de CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'https://propostadopintor.com.br'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir requisições sem origin (como mobile apps, curl, server-to-server) ou origens permitidas
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Require-Auth'],
    })
  );

  // 3. Limite de tamanho de payload (Prevenção de DoS por exaustão de memória)
  app.use(express.json({ limit: '1mb' }));

  // 4. Rate Limiting Geral para rotas da API
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: process.env.NODE_ENV === 'test' ? 2000 : 120, // Mais permissivo em testes automatizados
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Aguarde um momento e tente novamente.' },
  });

  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'sistema-propostas-pintura',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', createApiRouter(repository));

  // Servir frontend compilado se existir
  const clientDist = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res, next) => {
      if (_req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
