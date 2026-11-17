import { Platform } from 'react-native';

export interface RecoveryTokens {
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  isRecovery: boolean;
}

export function getPasswordResetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/redefinir-senha`;
  }
  return 'meuappdesaude://redefinir-senha';
}

export function extrairTokensRecuperacaoUrl(url?: string | null): RecoveryTokens {
  if (!url) return { isRecovery: false };

  const params = new URLSearchParams();
  const [withoutHash, hashPart] = url.split('#');
  const queryIndex = withoutHash.indexOf('?');

  if (queryIndex >= 0) {
    const qParams = new URLSearchParams(withoutHash.slice(queryIndex + 1));
    qParams.forEach((v, k) => params.set(k, v));
  }
  if (hashPart) {
    const hParams = new URLSearchParams(hashPart);
    hParams.forEach((v, k) => params.set(k, v));
  }

  const type = params.get('type') || undefined;
  const accessToken = params.get('access_token') || undefined;
  const refreshToken = params.get('refresh_token') || undefined;
  const isRecovery =
    type === 'recovery' || url.toLowerCase().includes('redefinir-senha');

  return { accessToken, refreshToken, type, isRecovery };
}

export function avaliarForcaSenha(senha: string): {
  nivel: 'fraca' | 'media' | 'forte';
  label: string;
  cor: string;
} {
  if (senha.length < 6) {
    return { nivel: 'fraca', label: 'Muito curta (mínimo 6 caracteres)', cor: '#B91C1C' };
  }
  let pontos = 0;
  if (senha.length >= 8) pontos += 1;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos += 1;
  if (/\d/.test(senha)) pontos += 1;
  if (/[^A-Za-z0-9]/.test(senha)) pontos += 1;

  if (pontos >= 3) {
    return { nivel: 'forte', label: 'Senha forte', cor: '#15803D' };
  }
  if (pontos >= 1) {
    return { nivel: 'media', label: 'Senha razoável (adicione números ou símbolos)', cor: '#B45309' };
  }
  return { nivel: 'fraca', label: 'Senha simples (use letras e números)', cor: '#B91C1C' };
}

export function aplicarMascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
