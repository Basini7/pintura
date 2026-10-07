import { createHash, randomBytes } from 'node:crypto';
import { Proposal } from '../types/domain.js';

export function generatePublicProposalToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashProposalContent(proposal: Proposal): string {
  const content = JSON.stringify({
    proposalNumber: proposal.proposalNumber,
    client: proposal.client,
    areas: proposal.areas,
    pricing: proposal.pricing,
    terms: proposal.terms,
  });
  return createHash('sha256').update(content).digest('hex');
}
