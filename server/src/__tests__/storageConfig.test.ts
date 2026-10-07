import { afterEach, describe, expect, it } from 'vitest';
import { createStorageRepository } from '../storage/index.js';

const configKeys = [
  'NODE_ENV',
  'STORAGE_BACKEND',
  'KIWIFY_WEBHOOK_SECRET',
  'KIWIFY_PRODUCT_ID_BASIC',
  'KIWIFY_PRODUCT_ID_INTERMEDIATE',
  'KIWIFY_PRODUCT_ID_PRO',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'SUPABASE_DB_URL',
];
const originalEnvironment = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of configKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('Storage de produção', () => {
  it('não bloqueia o boot por falta de configuração opcional da Kiwify', async () => {
    process.env.NODE_ENV = 'production';
    for (const key of configKeys.filter((key) => key !== 'NODE_ENV' && key !== 'STORAGE_BACKEND')) delete process.env[key];
    process.env.STORAGE_BACKEND = 'supabase';

    await expect(createStorageRepository()).rejects.toThrow('Supabase exige SUPABASE_URL');
  });

  it('não seleciona storage implícito nem recorre ao JSON em produção', async () => {
    process.env.NODE_ENV = 'production';
    process.env.KIWIFY_WEBHOOK_SECRET = 'test-secret';
    process.env.KIWIFY_PRODUCT_ID_BASIC = 'basic-id';
    process.env.KIWIFY_PRODUCT_ID_INTERMEDIATE = 'intermediate-id';
    process.env.KIWIFY_PRODUCT_ID_PRO = 'pro-id';
    delete process.env.STORAGE_BACKEND;

    await expect(createStorageRepository()).rejects.toThrow('STORAGE_BACKEND');
  });
});
