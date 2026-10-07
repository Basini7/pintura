import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../app.js';
import { JsonRepository } from '../storage/jsonRepository.js';

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
      expect(res.body.error).toContain('mínimo 6 caracteres');
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

    it('deve registrar usuário com sucesso e retornar token de sessão', async () => {
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
      expect(res.body.token).toBeDefined();
      expect(res.body.profile.companyName).toContain('Carlos Silva');
      expect(res.body.subscription.planId).toBe('free');
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
      expect(resCerto.body.token).toBeDefined();
    });

    it('deve encerrar sessão (logout) e invalidar o token', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Roberto',
          email: 'roberto@pintor.com',
          password: 'senhaRoberto123',
        });

      const token = reg.body.token;

      // Validar que o token funciona
      const meRes1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .set('x-require-auth', 'true');
      expect(meRes1.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      // Após logout, acesso com token deve ser rejeitado
      const meRes2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .set('x-require-auth', 'true');
      expect(meRes2.status).toBe(401);
    });
  });

  describe('3. Isolamento Estrito de Dados por Pintor (Multi-Tenant)', () => {
    it('o Usuário 2 NÃO deve ver nem poder alterar/excluir propostas do Usuário 1', async () => {
      // Registrar Pintor 1
      const regUser1 = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Um', email: 'user1@teste.com', password: 'senhaForte1' });
      const token1 = regUser1.body.token;

      // Registrar Pintor 2
      const regUser2 = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pintor Dois', email: 'user2@teste.com', password: 'senhaForte2' });
      const token2 = regUser2.body.token;

      // Pintor 1 cria proposta
      const createRes = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          id: 'prop-user-1',
          client: { name: 'Cliente do Pintor Um', address: 'Rua Um, 100' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 4000, discount: 0, netAmount: 4000 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'DRAFT',
        });
      expect(createRes.status).toBe(201);

      // Pintor 1 vê sua proposta
      const listUser1 = await request(app)
        .get('/api/proposals')
        .set('Authorization', `Bearer ${token1}`);
      expect(listUser1.body).toHaveLength(1);
      expect(listUser1.body[0].client.name).toBe('Cliente do Pintor Um');

      // Pintor 2 lista propostas: NÃO deve ver a proposta do Pintor 1
      const listUser2 = await request(app)
        .get('/api/proposals')
        .set('Authorization', `Bearer ${token2}`);
      expect(listUser2.body).toHaveLength(0);

      // Pintor 2 tenta acessar proposta do Pintor 1 por ID: 404
      const getUser2 = await request(app)
        .get('/api/proposals/prop-user-1')
        .set('Authorization', `Bearer ${token2}`);
      expect(getUser2.status).toBe(404);

      // Pintor 2 tenta excluir proposta do Pintor 1: 404
      const delUser2 = await request(app)
        .delete('/api/proposals/prop-user-1')
        .set('Authorization', `Bearer ${token2}`);
      expect(delUser2.status).toBe(404);

      // Pintor 1 continua com sua proposta intacta
      const getPintor1 = await request(app)
        .get('/api/proposals/prop-user-1')
        .set('Authorization', `Bearer ${token1}`);
      expect(getPintor1.status).toBe(200);
      expect(getPintor1.body.id).toBe('prop-user-1');
    });
  });

  describe('4. Validação e Sanitização da Assinatura Digital', () => {
    it('deve rejeitar tentativa de injeção de texto ou script no lugar da imagem da assinatura', async () => {
      // Criar proposta
      await request(app)
        .post('/api/proposals')
        .send({
          id: 'prop-sec-sign',
          client: { name: 'Cliente Assinatura', address: 'Rua X' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 1000, discount: 0, netAmount: 1000 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'DRAFT',
        });

      // Tentar aprovar com payload não-imagem (script injection)
      const badSign = await request(app)
        .post('/api/proposals/prop-sec-sign/approve')
        .send({
          signerName: 'Cliente Fake',
          signature: '<script>alert(1)</script>',
        });

      expect(badSign.status).toBe(400);
      expect(badSign.body.error).toContain('Deve ser imagem Base64 válida');
    });

    it('deve aceitar assinatura válida em formato Base64 PNG', async () => {
      // Criar proposta
      await request(app)
        .post('/api/proposals')
        .send({
          id: 'prop-sec-sign-valid',
          client: { name: 'Cliente Real', address: 'Rua Y' },
          areas: [],
          pricing: { mode: 'GLOBAL', totalAmount: 1200, discount: 0, netAmount: 1200 },
          terms: { includesMaterials: false, paymentCondition: 'À vista', withInvoice: false, validityDays: 15 },
          status: 'DRAFT',
        });

      const validSign = await request(app)
        .post('/api/proposals/prop-sec-sign-valid/approve')
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
