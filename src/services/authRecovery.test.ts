import {
  aplicarMascaraTelefone,
  avaliarForcaSenha,
  extrairTokensRecuperacaoUrl,
} from './authRecovery';

describe('helpers de autenticação e recuperação de senha', () => {
  it('extrai tokens e identifica link de recuperação em deep link e URL Web', () => {
    const nativeLink =
      'meuappdesaude://redefinir-senha#access_token=abc123&refresh_token=ref456&type=recovery';
    expect(extrairTokensRecuperacaoUrl(nativeLink)).toEqual({
      accessToken: 'abc123',
      refreshToken: 'ref456',
      type: 'recovery',
      isRecovery: true,
    });

    const webLink = 'https://app.unc.br/?type=signup#access_token=xyz';
    expect(extrairTokensRecuperacaoUrl(webLink).isRecovery).toBe(false);
  });

  it('avalia força de senha corretamente', () => {
    expect(avaliarForcaSenha('123').nivel).toBe('fraca');
    expect(avaliarForcaSenha('senha123').nivel).toBe('media');
    expect(avaliarForcaSenha('Senha@2026').nivel).toBe('forte');
  });

  it('aplica máscara de telefone brasileira para 10 e 11 dígitos', () => {
    expect(aplicarMascaraTelefone('4736415500')).toBe('(47) 3641-5500');
    expect(aplicarMascaraTelefone('47999998888')).toBe('(47) 99999-8888');
  });
});
