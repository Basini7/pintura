import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../app.js';
import { JsonRepository } from '../storage/jsonRepository.js';

describe('Gestão de Quotas e Assinaturas SaaS (Subscription & Quotas)', () => {
  let tempDir: string;
  let repository: JsonRepository;
  let app: any;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'saas-sub-test-'));
    repository = new JsonRepository(tempDir);
    app = createApp(repository);
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Pintor Quotas', email: `quota-${Date.now()}@test.com`, password: 'senhaValida123' });
    authToken = registration.headers['set-cookie'][0].split(';')[0];
    userId = registration.body.user.id;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('deve iniciar com o plano Degustação Gratuita (limite: 1 proposta, com marca d’água)', async () => {
    const res = await request(app).get('/api/subscription').set('Cookie', authToken);
    expect(res.status).toBe(200);
    expect(res.body.planId).toBe('free');
    expect(res.body.monthlyLimit).toBe(1);
    expect(res.body.usedProposalsCount).toBe(0);
    expect(res.body.hasWatermark).toBe(true);
  });

  it('deve permitir criar exatamente 1 proposta gratuita e bloquear a 2ª com erro 403 QUOTA_EXCEEDED', async () => {
    // 1. Criar a primeira proposta gratuita
    const res1 = await request(app)
      .post('/api/proposals')
      .set('Cookie', authToken)
      .send({
        id: 'prop-free-1',
        client: { name: 'Cliente Degustação 1', address: 'Rua A, 10' },
        areas: [],
        pricing: { mode: 'GLOBAL', totalAmount: 2000, discount: 0, netAmount: 2000 },
        terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
        status: 'DRAFT',
      });

    expect(res1.status).toBe(201);
    const proposalId = res1.body.id;

    // Conferir consumo de cota (1/1)
    const subCheck1 = await request(app).get('/api/subscription').set('Cookie', authToken);
    expect(subCheck1.body.usedProposalsCount).toBe(1);

    // 2. Tentar criar a segunda proposta no plano gratuito (deve bloquear!)
    const res2 = await request(app)
      .post('/api/proposals')
      .set('Cookie', authToken)
      .send({
        id: 'prop-free-2',
        client: { name: 'Cliente Degustação 2', address: 'Rua B, 20' },
        areas: [],
        pricing: { mode: 'GLOBAL', totalAmount: 3000, discount: 0, netAmount: 3000 },
        terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
        status: 'DRAFT',
      });

    expect(res2.status).toBe(403);
    expect(res2.body.error).toBe('QUOTA_EXCEEDED');
    expect(res2.body.message).toContain('Limite de 1 proposta(s) atingido no plano Degustação Gratuita');

    // 3. Tentar duplicar também deve ser bloqueado
    const dupRes = await request(app)
      .post(`/api/proposals/${proposalId}/duplicate`)
      .set('Cookie', authToken)
      .send({ newClientName: 'Cliente Duplicado' });

    expect(dupRes.status).toBe(403);
    expect(dupRes.body.error).toBe('QUOTA_EXCEEDED');

    // 4. Edição da proposta existente NÃO deve ser bloqueada (não consome cota adicional)
    const updateRes = await request(app)
      .post('/api/proposals')
      .set('Cookie', authToken)
      .send({
        id: proposalId,
        client: { name: 'Cliente Degustação 1 Editado', address: 'Rua A, 10' },
        areas: [],
        pricing: { mode: 'GLOBAL', totalAmount: 2500, discount: 0, netAmount: 2500 },
        terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
        status: 'DRAFT',
      });

    expect(updateRes.status).toBe(201);
  });

  it('deve desbloquear a criação após upgrade para o Plano Básico (R$ 38) ou Pro (R$ 59)', async () => {
    // 1. Criar primeira proposta e estourar cota free
    await request(app)
      .post('/api/proposals')
      .send({
        id: 'prop-1',
        client: { name: 'Cliente 1', address: 'Rua 1' },
        areas: [],
        pricing: { mode: 'GLOBAL', totalAmount: 1000, discount: 0, netAmount: 1000 },
        terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
        status: 'DRAFT',
      });

    // 2. Fazer Upgrade para Básico (4 propostas/mês)
    const upgradeBasic = await repository.upgradeSubscription('basic', userId);
    expect(upgradeBasic.planId).toBe('basic');
    expect(upgradeBasic.monthlyLimit).toBe(4);

    // 3. Agora a 2ª proposta deve passar com sucesso
    const res2 = await request(app)
      .post('/api/proposals')
      .set('Cookie', authToken)
      .send({
        id: 'prop-2',
        client: { name: 'Cliente 2', address: 'Rua 2' },
        areas: [],
        pricing: { mode: 'GLOBAL', totalAmount: 1000, discount: 0, netAmount: 1000 },
        terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
        status: 'DRAFT',
      });

    expect(res2.status).toBe(201);

    // 4. Upgrade para o Plano Pro Ilimitado (R$ 59)
    const upgradePro = await repository.upgradeSubscription('pro', userId);
    expect(upgradePro.planId).toBe('pro');
    expect(upgradePro.monthlyLimit).toBe(-1); // Ilimitado
    expect(upgradePro.hasWatermark).toBe(false); // Sem marca d'água!
  });
});
