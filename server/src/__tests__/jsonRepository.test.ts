import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { JsonRepository } from '../storage/jsonRepository.js';
import { Proposal } from '../types/domain.js';

describe('Repositório de Persistência JSON (TASK-004)', () => {
  let tempDir: string;
  let repo: JsonRepository;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pintura-test-'));
    repo = new JsonRepository(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('deve retornar perfil padrão e permitir atualização', async () => {
    const profile = await repo.getProfile();
    expect(profile.companyName).toBeDefined();

    const updated = await repo.updateProfile({
      ...profile,
      companyName: 'Minha Pintura Profissional',
      phones: ['(12) 98888-7777'],
    });

    expect(updated.companyName).toBe('Minha Pintura Profissional');
    const reloaded = await repo.getProfile();
    expect(reloaded.companyName).toBe('Minha Pintura Profissional');
  });

  it('deve criar, listar, atualizar e deletar uma proposta', async () => {
    const newProposal: Proposal = {
      id: 'test-1',
      proposalNumber: '',
      createdAt: '',
      updatedAt: '',
      status: 'DRAFT',
      client: {
        name: 'Cliente Teste',
        address: 'Rua das Flores, 123',
      },
      areas: [],
      pricing: {
        mode: 'GLOBAL',
        totalAmount: 15000,
        discount: 0,
        netAmount: 15000,
      },
      terms: {
        includesMaterials: false,
        paymentCondition: 'A combinar',
        withInvoice: false,
        validityDays: 30,
      },
    };

    const saved = await repo.saveProposal(newProposal);
    expect(saved.id).toBe('test-1');
    expect(saved.proposalNumber).toContain('PROP-');
    expect(saved.createdAt).toBeDefined();

    const list = await repo.listProposals();
    expect(list).toHaveLength(1);
    expect(list[0].client.name).toBe('Cliente Teste');

    const fetched = await repo.getProposalById('test-1');
    expect(fetched?.pricing.totalAmount).toBe(15000);

    // Atualização
    saved.pricing.totalAmount = 18000;
    saved.pricing.netAmount = 18000;
    await repo.saveProposal(saved);

    const updatedList = await repo.listProposals();
    expect(updatedList[0].pricing.totalAmount).toBe(18000);

    // Duplicação
    const duplicated = await repo.duplicateProposal('test-1', 'Cliente Cópia');
    expect(duplicated).toBeDefined();
    expect(duplicated?.id).not.toBe('test-1');
    expect(duplicated?.client.name).toBe('Cliente Cópia');

    const listAfterDup = await repo.listProposals();
    expect(listAfterDup).toHaveLength(2);

    // Deleção
    const deleted = await repo.deleteProposal('test-1');
    expect(deleted).toBe(true);

    const finalList = await repo.listProposals();
    expect(finalList).toHaveLength(1);
    expect(finalList[0].id).toBe(duplicated?.id);
  });
});
