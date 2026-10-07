import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../app.js';
import { JsonRepository } from '../storage/jsonRepository.js';

describe('Webhook de Pagamento Kiwify (TASK-006)', () => {
  let tempDir: string;
  let repo: JsonRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pintura-kiwify-test-'));
    repo = new JsonRepository(tempDir);
    app = createApp(repo);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('deve rejeitar webhook se o e-mail do cliente não for enviado', async () => {
    const res = await request(app)
      .post('/api/webhooks/kiwify')
      .send({
        order_status: 'paid',
        Product: { product_name: 'Plano Pro' },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('E-mail do cliente');
  });

  it('deve ativar o Plano Pro Ilimitado para um usuário já cadastrado', async () => {
    // 1. Cadastrar pintor (inicia no plano Free)
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Carlos Pintor',
        email: 'carlos@silvapinturas.com',
        password: 'senhaSegura123',
      });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.subscription.planId).toBe('free');

    // 2. Simular disparo de webhook da Kiwify informando pagamento aprovado do Plano Pro
    const webhookRes = await request(app)
      .post('/api/webhooks/kiwify')
      .send({
        order_status: 'paid',
        webhook_event_type: 'order_approved',
        Customer: {
          email: 'carlos@silvapinturas.com',
          full_name: 'Carlos Pintor',
        },
        Product: {
          product_name: 'Proposta do Pintor - Plano Pro Ilimitado',
        },
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.action).toBe('PLAN_ACTIVATED');
    expect(webhookRes.body.planId).toBe('pro');

    // 3. Conferir se no sistema o usuário agora é Pro Ilimitado
    const token = registerRes.body.token;
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .set('x-require-auth', 'true');

    expect(meRes.status).toBe(200);
    expect(meRes.body.subscription.planId).toBe('pro');
    expect(meRes.body.subscription.monthlyLimit).toBe(-1); // Ilimitado!
  });

  it('deve ativar plano pendente para quem comprou na Kiwify antes de se cadastrar no site', async () => {
    // 1. Pagamento aprovado na Kiwify antes do cadastro
    const webhookRes = await request(app)
      .post('/api/webhooks/kiwify')
      .send({
        order_status: 'approved',
        Customer: {
          email: 'comprador.adiantado@gmail.com',
        },
        Product: {
          product_name: 'Plano Pro Ilimitado Mensal',
        },
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.action).toBe('PLAN_ACTIVATED');
    expect(webhookRes.body.planId).toBe('pro');

    // 2. O usuário entra no site minutos depois e cria sua conta com o mesmo e-mail
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pintor Adiantado',
        email: 'comprador.adiantado@gmail.com',
        password: 'senhaCriadaAgora123',
      });

    expect(registerRes.status).toBe(201);
    // Deve nascer diretamente como PRO!
    expect(registerRes.body.subscription.planId).toBe('pro');
    expect(registerRes.body.subscription.monthlyLimit).toBe(-1);
  });

  it('deve reverter plano para free em caso de reembolso ou estorno', async () => {
    // 1. Cadastrar e ativar Pro
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pintor Reembolso',
        email: 'reembolso@pintor.com',
        password: 'senhaValida123',
      });

    await request(app)
      .post('/api/webhooks/kiwify')
      .send({
        order_status: 'paid',
        Customer: { email: 'reembolso@pintor.com' },
        Product: { product_name: 'Plano Pro' },
      });

    // 2. Disparar webhook de reembolso
    const refundRes = await request(app)
      .post('/api/webhooks/kiwify')
      .send({
        order_status: 'refunded',
        webhook_event_type: 'order_refunded',
        Customer: { email: 'reembolso@pintor.com' },
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.action).toBe('PLAN_CANCELED');
  });
});
