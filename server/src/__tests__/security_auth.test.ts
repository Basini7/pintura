import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../app.js';
import { JsonRepository } from '../storage/jsonRepository.js';

function sessionCookie(response: any): string {
  return response.headers['set-cookie'][0].split(';')[0];
}

describe('Blindagem de Segurança e Autenticação Multi-Tenant (OPÇÃO 2)', () => {
  let tempDir: string;
  let repo: JsonRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pintura-sec-test-'));
    repo = new JsonRepository(tempDir);
    app = createApp(repo);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('1. Cabeçalhos de Segurança HTTP (Helmet)', () => {
    it('deve ocultar cabeçalho X-Powered-By e incluir cabeçalhos seguros', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('2. Autenticação e Registro com Criptografia Segura', () => {
    it('deve rejeitar senha fraca (< 6 caracteres)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Pintor Teste',
          email: 'pintor@teste.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mínimo 12 caracteres');
    });

    it('deve rejeitar e-mail em formato inválido', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Pintor Teste',
          email: 'email_invalido',
          password: 'senhaSegura123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('E-mail informado é inválido');
    });

    it('deve registrar usuário com sessão HttpOnly sem retornar o token no JSON', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Carlos Silva',
          email: 'carlos@silvapinturas.com.br',
          password: 'minhaSenhaForte2026',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('carlos@silvapinturas.com.br');
      expect(res.body.token).toBeUndefined();
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(res.body.profile.companyName).toContain('Carlos Silva');
      expect(res.body.subscription.planId).toBe('free');

      const sessions = JSON.parse(await fs.readFile(path.join(tempDir, 'sessions.json'), 'utf-8'));
      expect(sessions[0].token).not.toBe(sessionCookie(res).split('=')[1]);
      expect(sessions[0].token).toHaveLength(64);
    });

    it('deve impedir cadastro duplicado com mesmo e-mail', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Carlos Silva',
          email: 'carlos@silvapinturas.com.br',
          password: 'senhaValida123',
        });

      const resDuplicado = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Outro Pintor',
          email: 'carlos@silvapinturas.com.br',
          password: 'outraSenha123',
        });

      expect(resDuplicado.status).toBe(400);
      expect(resDuplicado.body.error).toContain('já está cadastrado');
    });

    it('deve realizar login com sucesso e rejeitar senha incorreta', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Marcos Pintor',
          email: 'marcos@pinturas.com',
          password: 'senhaCorreta123',
        });

      // Senha incorreta
      const resErrado = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'marcos@pinturas.com',
          password: 'senhaErrada',
        });
      expect(resErrado.status).toBe(401);

      // Senha correta
      const resCerto = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'marcos@pinturas.com',
          password: 'senhaCorreta123',
        });
      expect(resCerto.status).toBe(200);
      expect(sessionCookie(resCerto)).toContain('pintura_session=');
    });

    it('deve encerrar sessão (logout) e invalidar o token', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Roberto',
          email: 'roberto@pintor.com',
          password: 'senhaRoberto123',
        });

      const cookie = sessionCookie(reg);

      // Validar que o token funciona
      const meRes1 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);
      expect(meRes1.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);
      expect(logoutRes.status).toBe(200);

      // Após logout, acesso com token deve ser rejeitado
      const meRes2 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);
      expect(meRes2.status).toBe(401);
    });
  });

  describe('3. Isolamento Estrito de Dados por Pintor (Multi-Tenant)', () => {
    it('deve rejeitar rotas privadas sem autenticação', async () => {
      const responses = await Promise.all([
        request(app).get('/api/profile'),
        request(app).put('/api/profile').send({}),
        request(app).get('/api/subscription'),
        request(app).get('/api/proposals'),
        request(app).get('/api/proposals/anonymous-id'),
        request(app).post('/api/proposals').send({}),
        request(app).delete('/api/proposals/anonymous-id'),
        request(app).post('/api/proposals/anonymous-id/duplicate').send({}),
      ]);

      expect(responses.map((response) => response.status)).toEqual(Array(8).fill(401));
    });

    it('não deve expor endpoint para upgrade manual de assinatura', async () => {
      const registration = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Plano', email: 'manual-upgrade@test.com', password: 'senhaValida123' });
      const response = await request(app)
        .post('/api/subscription/upgrade')
        .set('Cookie', sessionCookie(registration))
        .send({ planId: 'pro' });

      expect(response.status).toBe(404);
    });

    it('deve usar token público secreto e permitir aprovação apenas uma vez após envio', async () => {
      const registration = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Público', email: 'public-token@test.com', password: 'senhaValida123' });
      const cookie = sessionCookie(registration);
      const created = await request(app)
        .post('/api/proposals')
        .set('Cookie', cookie)
        .send({
          id: 'client-controlled-id',
          client: { name: 'Cliente Público', address: 'Rua Segura, 1' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 1200, discount: 0, netAmount: 1200 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'APPROVED',
          viewCount: 7,
        });

      expect(created.status).toBe(201);
      expect(created.body.id).not.toBe('client-controlled-id');
      expect(created.body.status).toBe('DRAFT');
      expect(created.body.viewCount).toBe(0);
      expect(created.body.publicToken).toEqual(expect.any(String));

      const internalIdAccess = await request(app).get(`/api/public/proposals/${created.body.id}`);
      expect(internalIdAccess.status).toBe(404);

      const publicPath = `/api/public/proposals/${created.body.publicToken}`;
      const publicResponse = await request(app).get(publicPath);
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.body.proposal).not.toHaveProperty('userId');
      expect(publicResponse.body.proposal).not.toHaveProperty('signature');
      expect(publicResponse.body.proposal).not.toHaveProperty('publicToken');

      const earlyApproval = await request(app)
        .post(`${publicPath}/approve`)
        .send({ signerName: 'Cliente Público', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' });
      expect(earlyApproval.status).toBe(409);

      const viewed = await request(app).post(`${publicPath}/view`);
      expect(viewed.status).toBe(200);
      expect(viewed.body.status).toBe('SENT');

      const approvalPayload = {
        signerName: 'Cliente Público',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      const approval = await request(app)
        .post(`${publicPath}/approve`)
        .set('User-Agent', 'security-test-agent')
        .send(approvalPayload);
      expect(approval.status).toBe(200);
      expect(approval.body.status).toBe('APPROVED');
      expect(approval.body).not.toHaveProperty('signature');

      const secondApproval = await request(app).post(`${publicPath}/approve`).send(approvalPayload);
      expect(secondApproval.status).toBe(409);
    });

    it('o Usuário 2 NÃO deve ver nem poder alterar/excluir propostas do Usuário 1', async () => {
      // Registrar Pintor 1
      const regUser1 = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Um', email: 'user1@teste.com', password: 'senhaForte123' });
      const token1 = sessionCookie(regUser1);

      // Registrar Pintor 2
      const regUser2 = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Dois', email: 'user2@teste.com', password: 'senhaForte234' });
      const token2 = sessionCookie(regUser2);

      // Pintor 1 cria proposta
      const createRes = await request(app)
        .post('/api/proposals')
        .set('Cookie', token1)
        .send({
          id: 'prop-user-1',
          client: { name: 'Cliente do Pintor Um', address: 'Rua Um, 100' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 4000, discount: 0, netAmount: 4000 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'DRAFT',
        });
      expect(createRes.status).toBe(201);
      const proposalId = createRes.body.id;

      // Pintor 1 vê sua proposta
      const listUser1 = await request(app)
        .get('/api/proposals')
        .set('Cookie', token1);
      expect(listUser1.body).toHaveLength(1);
      expect(listUser1.body[0].client.name).toBe('Cliente do Pintor Um');

      // Pintor 2 lista propostas: NÃO deve ver a proposta do Pintor 1
      const listUser2 = await request(app)
        .get('/api/proposals')
        .set('Cookie', token2);
      expect(listUser2.body).toHaveLength(0);

      // Pintor 2 tenta acessar proposta do Pintor 1 por ID: 404
      const getUser2 = await request(app)
        .get(`/api/proposals/${proposalId}`)
        .set('Cookie', token2);
      expect(getUser2.status).toBe(404);

      // Pintor 2 tenta excluir proposta do Pintor 1: 404
      const delUser2 = await request(app)
        .delete(`/api/proposals/${proposalId}`)
        .set('Cookie', token2);
      expect(delUser2.status).toBe(404);

      // Pintor 1 continua com sua proposta intacta
      const getPintor1 = await request(app)
        .get(`/api/proposals/${proposalId}`)
        .set('Cookie', token1);
      expect(getPintor1.status).toBe(200);
      expect(getPintor1.body.id).toBe(proposalId);
    });
  });

  describe('4. Validação e Sanitização da Assinatura Digital', () => {
    it('deve rejeitar tentativa de injeção de texto ou script no lugar da imagem da assinatura', async () => {
      const registration = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Assinatura', email: 'sign-invalid@test.com', password: 'senhaValida123' });

      // Criar proposta
      const created = await request(app)
        .post('/api/proposals')
        .set('Cookie', sessionCookie(registration))
        .send({
          id: 'prop-sec-sign',
          client: { name: 'Cliente Assinatura', address: 'Rua X' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 1000, discount: 0, netAmount: 1000 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'DRAFT',
        });

      const publicPath = `/api/public/proposals/${created.body.publicToken}`;
      await request(app).post(`${publicPath}/view`);

      // Tentar aprovar com payload não-imagem (script injection)
      const badSign = await request(app)
        .post(`${publicPath}/approve`)
        .send({
          signerName: 'Cliente Fake',
          signature: '<script>alert(1)</script>',
        });

      expect(badSign.status).toBe(400);
      expect(badSign.body.error).toContain('Deve ser imagem Base64 válida');
    });

    it('deve aceitar assinatura válida em formato Base64 PNG', async () => {
      const registration = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Assinatura', email: 'sign-valid@test.com', password: 'senhaValida123' });

      // Criar proposta
      const created = await request(app)
        .post('/api/proposals')
        .set('Cookie', sessionCookie(registration))
        .send({
          id: 'prop-sec-sign-valid',
          client: { name: 'Cliente Real', address: 'Rua Y' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 1200, discount: 0, netAmount: 1200 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'DRAFT',
        });

      const publicPath = `/api/public/proposals/${created.body.publicToken}`;
      await request(app).post(`${publicPath}/view`);

      const validSign = await request(app)
        .post(`${publicPath}/approve`)
        .send({
          signerName: 'Cliente Real',
          signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });

      expect(validSign.status).toBe(200);
      expect(validSign.body.status).toBe('APPROVED');
      expect(validSign.body.signerName).toBe('Cliente Real');
    });
  });
});
