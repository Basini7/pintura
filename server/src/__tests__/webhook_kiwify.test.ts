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
  let originalEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    originalEnv = {
      KIWIFY_WEBHOOK_SECRET: process.env.KIWIFY_WEBHOOK_SECRET,
      KIWIFY_PRODUCT_ID_BASIC: process.env.KIWIFY_PRODUCT_ID_BASIC,
      KIWIFY_PRODUCT_ID_INTERMEDIATE: process.env.KIWIFY_PRODUCT_ID_INTERMEDIATE,
      KIWIFY_PRODUCT_ID_PRO: process.env.KIWIFY_PRODUCT_ID_PRO,
    };
    process.env.KIWIFY_WEBHOOK_SECRET = 'test-kiwify-secret';
    process.env.KIWIFY_PRODUCT_ID_BASIC = 'product-basic';
    process.env.KIWIFY_PRODUCT_ID_INTERMEDIATE = 'product-intermediate';
    process.env.KIWIFY_PRODUCT_ID_PRO = 'product-pro';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pintura-kiwify-test-'));
    repo = new JsonRepository(tempDir);
    app = createApp(repo);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('deve rejeitar webhook se o e-mail do cliente não for enviado', async () => {
    const res = await request(app)
      .post('/api/webhooks/kiwify')
      .set('x-kiwify-token', 'test-kiwify-secret')
      .send({
        order_status: 'paid',
        Product: { product_name: 'Plano Pro' },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('E-mail do cliente');
  });

  it('deve rejeitar token ausente ou enviado pela query string', async () => {
    const response = await request(app)
      .post('/api/webhooks/kiwify?token=test-kiwify-secret')
      .send({ order_status: 'paid', email: 'buyer@example.com' });

    expect(response.status).toBe(401);
  });

  it('deve aceitar segredo no caminho, para provedores sem suporte a cabeçalhos customizados', async () => {
    const response = await request(app)
      .post('/api/webhooks/kiwify/test-kiwify-secret')
      .send({
        event_id: 'path-secret-unknown-event',
        event: 'unrelated_event',
        Customer: { email: 'buyer@example.com' },
      });

    expect(response.status).toBe(200);
    expect(response.body.action).toBe('EVENT_ACKNOWLEDGED');
  });

  it('deve ignorar produto desconhecido sem conceder um plano padrão', async () => {
    const response = await request(app)
      .post('/api/webhooks/kiwify')
      .set('x-kiwify-token', 'test-kiwify-secret')
      .send({
        event_id: 'unknown-product-event',
        order_status: 'paid',
        webhook_event_type: 'order_approved',
        Customer: { email: 'buyer@example.com' },
        Product: { product_id: 'unmapped-product' },
      });

    expect(response.status).toBe(202);
    expect(response.body.action).toBe('UNKNOWN_PRODUCT_IGNORED');
  });

  it('deve processar uma única vez a mesma entrega de webhook', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Pintor Idempotência',
      email: 'idempotency@example.com',
      password: 'senhaValida123',
    });
    const payload = {
      event_id: 'unique-payment-event',
      order_status: 'paid',
      webhook_event_type: 'order_approved',
      Customer: { email: 'idempotency@example.com' },
      Product: { product_id: 'product-pro' },
    };

    const first = await request(app).post('/api/webhooks/kiwify').set('x-kiwify-token', 'test-kiwify-secret').send(payload);
    const second = await request(app).post('/api/webhooks/kiwify').set('x-kiwify-token', 'test-kiwify-secret').send(payload);

    expect(first.body.action).toBe('PLAN_ACTIVATED');
    expect(second.body.action).toBe('DUPLICATE_IGNORED');
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
      .set('x-kiwify-token', 'test-kiwify-secret')
      .send({
        order_status: 'paid',
        webhook_event_type: 'order_approved',
        Customer: {
          email: 'carlos@silvapinturas.com',
          full_name: 'Carlos Pintor',
        },
        Product: { product_id: 'product-pro' },
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.action).toBe('PLAN_ACTIVATED');
    expect(webhookRes.body.planId).toBe('pro');

    // 3. Conferir se no sistema o usuário agora é Pro Ilimitado
    const cookie = registerRes.headers['set-cookie'][0].split(';')[0];
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.subscription.planId).toBe('pro');
    expect(meRes.body.subscription.monthlyLimit).toBe(-1); // Ilimitado!
  });

  it('não deve conceder plano pendente a cadastro sem verificação do e-mail', async () => {
    // 1. Pagamento aprovado na Kiwify antes do cadastro
    const webhookRes = await request(app)
      .post('/api/webhooks/kiwify')
      .set('x-kiwify-token', 'test-kiwify-secret')
      .send({
        order_status: 'approved',
        webhook_event_type: 'order_approved',
        Customer: {
          email: 'comprador.adiantado@gmail.com',
        },
        Product: { product_id: 'product-pro' },
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
    expect(registerRes.body.subscription.planId).toBe('free');
    expect(registerRes.body.subscription.monthlyLimit).toBe(1);
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
      .set('x-kiwify-token', 'test-kiwify-secret')
      .send({
        order_status: 'paid',
        webhook_event_type: 'order_approved',
        Customer: { email: 'reembolso@pintor.com' },
        Product: { product_id: 'product-pro' },
      });

    // 2. Disparar webhook de reembolso
    const refundRes = await request(app)
      .post('/api/webhooks/kiwify')
      .set('x-kiwify-token', 'test-kiwify-secret')
      .send({
        order_status: 'refunded',
        webhook_event_type: 'order_refunded',
        Customer: { email: 'reembolso@pintor.com' },
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.action).toBe('PLAN_CANCELED');
  });
});
