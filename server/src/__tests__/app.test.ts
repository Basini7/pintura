import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Health Check & Static Serving API', () => {
  it('GET /api/health deve responder status 200 e status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('sistema-propostas-pintura');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET / deve responder 200 com HTML do frontend', async () => {
    const app = createApp();
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<!doctype html>');
    expect(res.text).toContain('Proposta do Pintor');
  });
});
