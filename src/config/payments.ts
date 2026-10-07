import { PlanTier, User } from '../types.js';

/**
 * URLs dos Checkouts da Kiwify para os 3 planos do Proposta do Pintor.
 * Quando você criar os produtos na sua conta da Kiwify, basta colar os links aqui!
 */
export const KIWIFY_CHECKOUT_CONFIG: Record<Exclude<PlanTier, 'free'>, string> = {
  basic: '', // Ex: 'https://pay.kiwify.com.br/SEU_LINK_BASICO' (R$ 38/mês)
  intermediate: '', // Ex: 'https://pay.kiwify.com.br/SEU_LINK_INTERMEDIARIO' (R$ 47/mês)
  pro: '', // Ex: 'https://pay.kiwify.com.br/SEU_LINK_PRO' (R$ 59/mês)
};

/**
 * Monta o link do checkout da Kiwify com os dados do pintor pré-preenchidos (e-mail e nome)
 * eliminando a fricção de digitação na hora de pagar no Pix/Cartão.
 */
export function getKiwifyCheckoutUrl(planId: PlanTier, user?: User | null): string | null {
  if (planId === 'free') return null;
  const baseUrl = KIWIFY_CHECKOUT_CONFIG[planId];
  if (!baseUrl) return null;

  try {
    const url = new URL(baseUrl);
    if (user?.email) {
      url.searchParams.set('email', user.email);
    }
    if (user?.name) {
      url.searchParams.set('name', user.name);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}
