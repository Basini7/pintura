import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../app.js';
import { JsonRepository } from '../storage/jsonRepository.js';

describe('API Endpoints REST E2E (TASK-005)', () => {
  let tempDir: string;
  let repo: JsonRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pintura-api-test-'));
    repo = new JsonRepository(tempDir);
    app = createApp(repo);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('GET /api/catalog/areas deve retornar catálogo completo', async () => {
    const res = await request(app).get('/api/catalog/areas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(11);
  });

  it('POST /api/catalog/resolve-scope deve resolver escopo dinamicamente', async () => {
    const res = await request(app)
      .post('/api/catalog/resolve-scope')
      .send({
        areaId: 'fachada_externa',
        options: {
          cleaningMethod: 'Hidrojateamento',
          finishType: 'Textura Granfino Hidro-repelente',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.areaId).toBe('fachada_externa');
    expect(res.body.steps.some((s: string) => s.includes('hidrojateamento'))).toBe(true);
    expect(res.body.steps.some((s: string) => s.includes('Granfino'))).toBe(true);
  });

  it('POST /api/pricing/calculate deve calcular totais e parcelas', async () => {
    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        mode: 'GLOBAL',
        globalAmount: 30000,
        discountPercent: 10,
        paymentCondition: '30% entrada + 40% meio + 30% entrega',
      });

    expect(res.status).toBe(200);
    expect(res.body.summary.totalAmount).toBe(30000);
    expect(res.body.summary.discount).toBe(3000);
    expect(res.body.summary.netAmount).toBe(27000);
    expect(res.body.schedule).toHaveLength(3);
    expect(res.body.schedule[0].amount).toBe(8100);
  });

  it('GET e PUT /api/profile deve gerenciar perfil do prestador', async () => {
    const getRes = await request(app).get('/api/profile');
    expect(getRes.status).toBe(200);
    expect(getRes.body.companyName).toBeDefined();

    const putRes = await request(app)
      .put('/api/profile')
      .send({
        companyName: 'Pinturas & Reformas Express',
        phones: ['(11) 98888-7777'],
        pixKey: 'contato@empresaexemplo.com.br',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.companyName).toBe('Pinturas & Reformas Express');
    expect(putRes.body.pixKey).toBe('contato@empresaexemplo.com.br');
  });

  it('Fluxo CRUD completo de propostas: criar, listar, obter, duplicar e excluir', async () => {
    // 1. Criar proposta
    const createRes = await request(app)
      .post('/api/proposals')
      .send({
        id: 'prop-100',
        client: {
          name: 'João da Silva',
          address: 'Rua das Palmeiras, 500',
        },
        areas: [
          {
            areaId: 'paredes',
            areaName: 'Paredes Internas',
            category: 'ALVENARIA_INTERNA',
            steps: ['Lixamento', 'Pintura'],
            price: 5000,
          },
        ],
        pricing: {
          mode: 'BY_AREA',
          totalAmount: 5000,
          discount: 0,
          netAmount: 5000,
        },
        terms: {
          includesMaterials: false,
          paymentCondition: 'A combinar',
          withInvoice: false,
          validityDays: 30,
        },
        status: 'DRAFT',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.proposalNumber).toContain('PROP-');

    // 2. Listar
    const listRes = await request(app).get('/api/proposals');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    // 3. Obter por ID
    const getRes = await request(app).get('/api/proposals/prop-100');
    expect(getRes.status).toBe(200);
    expect(getRes.body.client.name).toBe('João da Silva');

    // 4. Upgrade de plano para permitir múltiplas propostas e duplicar
    await request(app).post('/api/subscription/upgrade').send({ planId: 'basic' });

    const dupRes = await request(app)
      .post('/api/proposals/prop-100/duplicate')
      .send({ newClientName: 'Maria Silva' });

    expect(dupRes.status).toBe(201);
    expect(dupRes.body.client.name).toBe('Maria Silva');

    const listAfterDup = await request(app).get('/api/proposals');
    expect(listAfterDup.body).toHaveLength(2);

    // 5. Deletar
    const delRes = await request(app).delete('/api/proposals/prop-100');
    expect(delRes.status).toBe(200);

    const listFinal = await request(app).get('/api/proposals');
    expect(listFinal.body).toHaveLength(1);
    expect(listFinal.body[0].client.name).toBe('Maria Silva');
  });

  it('Rastreamento de visualizações e aprovação com assinatura digital', async () => {
    // 1. Criar proposta
    await request(app)
      .post('/api/proposals')
      .send({
        id: 'prop-track-1',
        client: { name: 'Carlos Oliveira', address: 'Av. Brasil, 120' },
        areas: [],
        pricing: { mode: 'GLOBAL', totalAmount: 3500, discount: 0, netAmount: 3500 },
        terms: { includesMaterials: true, paymentCondition: 'À vista', withInvoice: true, validityDays: 15 },
        status: 'DRAFT',
      });

    // 2. Registrar visualização
    const viewRes1 = await request(app).post('/api/proposals/prop-track-1/view');
    expect(viewRes1.status).toBe(200);
    expect(viewRes1.body.viewCount).toBe(1);
    expect(viewRes1.body.viewedAt).toBeDefined();
    expect(viewRes1.body.status).toBe('SENT');

    // 3. Segunda visualização incrementa contador
    const viewRes2 = await request(app).post('/api/proposals/prop-track-1/view');
    expect(viewRes2.status).toBe(200);
    expect(viewRes2.body.viewCount).toBe(2);

    // 4. Aprovação com assinatura digital
    const approveRes = await request(app)
      .post('/api/proposals/prop-track-1/approve')
      .send({
        signerName: 'Carlos Oliveira',
        signature: 'data:image/png;base64,mockSignatureData',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
    expect(approveRes.body.signerName).toBe('Carlos Oliveira');
    expect(approveRes.body.signature).toBe('data:image/png;base64,mockSignatureData');
    expect(approveRes.body.approvedAt).toBeDefined();

    // 5. Validar erro se faltar dados de assinatura
    const badApprove = await request(app)
      .post('/api/proposals/prop-track-1/approve')
      .send({ signerName: '' });
    expect(badApprove.status).toBe(400);
  });
});
