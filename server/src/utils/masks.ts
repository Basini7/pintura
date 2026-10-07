/**
 * Aplica máscara de telefone brasileiro com sanitização avançada:
 * - Se o usuário colar com "+55", limpa o DDI internacional.
 * - Fixo: (99) 9999-9999 (10 dígitos)
 * - Celular: (99) 99999-9999 (11 dígitos)
 */
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length === 0) {
    return '';
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
