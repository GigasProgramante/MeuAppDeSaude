import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  ScreenShell,
  useFeedback,
} from '../../components/ui';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useStore } from '../../store/useStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { salvarPerfil } from '../../services/db';
import { aplicarMascaraTelefone, avaliarForcaSenha } from '../../services/authRecovery';
import { GUEST_CONTEXT_KEY } from '../../services/sync';
import { colors } from '../../theme/tokens';
import { styles } from './styles';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cadastro'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export default function RegisterScreen({ navigation }: Props) {
  const { showAlert } = useFeedback();
  const [nome, setNome] = useState('');
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosModalVisible, setTermosModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const forcaSenha = password ? avaliarForcaSenha(password) : null;

  const handleRegister = async () => {
    if (!emailOrCpf.trim() || !phone.trim() || !password || !confirmPassword) {
      showAlert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Atenção', 'As senhas não coincidem.');
      return;
    }

    const emailLimpo = emailOrCpf.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo);
    if (!emailValido) {
      showAlert('Atenção', 'Informe um endereço de e-mail válido (ex: nome@email.com).');
      return;
    }

    if (password.length < 6) {
      showAlert('Atenção', 'A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (!aceitouTermos) {
      showAlert(
        'Consentimento LGPD',
        'É necessário ler e aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.'
      );
      return;
    }

    const termosAceitosEm = new Date().toISOString();

    if (isSupabaseConfigured) {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailLimpo,
          password,
          options: {
            data: {
              nome: nome.trim() || undefined,
              telefone: phone.trim(),
              termos_aceitos_em: termosAceitosEm,
            },
          },
        });

        if (error) {
          showAlert('Erro no Cadastro', error.message);
          return;
        }

        const perfilInicial = {
          nome: nome.trim(),
          telefone: phone.trim(),
          fotoUri: null,
          termosAceitosEm,
        };

        if (data.user && data.session) {
          await useStore.getState().switchContext(data.user.id);
          useStore.getState().updatePerfil(perfilInicial);
          try {
            await salvarPerfil(data.user.id, perfilInicial);
          } catch (syncError) {
            console.warn('Não foi possível criar o perfil inicial na nuvem agora:', syncError);
          }
          showAlert('Sucesso', 'Cadastro realizado e perfil inicial criado!', () =>
            navigation.reset({ index: 0, routes: [{ name: 'Inicial' }] })
          );
        } else {
          showAlert(
            'Confirme seu E-mail',
            'Conta criada! Verifique sua caixa de entrada para confirmar o cadastro e depois faça login.',
            () => navigation.replace('Login')
          );
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
    useStore.getState().updatePerfil({
      ...(nome.trim() ? { nome: nome.trim() } : {}),
      telefone: phone.trim(),
      termosAceitosEm,
    });

    showAlert(
      'Cadastro Local Salvo',
      'Seus dados e aceite de privacidade foram salvos neste aparelho (modo offline). Para sincronizar na nuvem, configure o Supabase.',
      () => navigation.reset({ index: 0, routes: [{ name: 'Inicial' }] })
    );
  };

  return (
    <ScreenShell
      title="Criar Conta"
      subtitle="Preencha seus dados para acompanhamento pessoal."
      maxWidth="form"
      onBack={() => navigation.goBack()}
    >
      <AppCard variant="elevated">
        <View style={styles.logoHeader}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} />
        </View>

        <AppInput
          label="Nome Completo"
          placeholder="Como prefere ser chamado(a)"
          value={nome}
          onChangeText={setNome}
        />

        <AppInput
          label="E-mail *"
          placeholder="seu@email.com"
          value={emailOrCpf}
          onChangeText={setEmailOrCpf}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <AppInput
          label="Telefone *"
          placeholder="(47) 99999-9999"
          value={phone}
          onChangeText={(txt) => setPhone(aplicarMascaraTelefone(txt))}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <AppInput
          label="Senha *"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        {forcaSenha && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthBarTrack}>
              <View
                style={[
                  styles.strengthBarFill,
                  {
                    width:
                      forcaSenha.nivel === 'fraca'
                        ? '33%'
                        : forcaSenha.nivel === 'media'
                          ? '66%'
                          : '100%',
                    backgroundColor: forcaSenha.cor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthLabel, { color: forcaSenha.cor }]}>
              Força da senha: {forcaSenha.label}
            </Text>
          </View>
        )}

        <AppInput
          label="Confirmar Senha *"
          placeholder="Repita a senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
        />

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAceitouTermos((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: aceitouTermos }}
        >
          <Ionicons
            name={aceitouTermos ? 'checkbox' : 'square-outline'}
            size={24}
            color={aceitouTermos ? colors.brand.primary : colors.text.secondary}
          />
          <Text style={styles.termsText}>
            Li e concordo com os Termos de Uso e autorizo o armazenamento dos meus dados de saúde (LGPD).
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.termsLink} onPress={() => setTermosModalVisible(true)}>
          <Text style={styles.termsLinkText}>Ler resumo dos Termos e Privacidade</Text>
        </TouchableOpacity>

        <AppButton
          title="Cadastrar e Continuar"
          icon="person-add-outline"
          variant="primary"
          loading={loading}
          onPress={handleRegister}
        />

        <TouchableOpacity
          style={styles.loginPrompt}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginMuted}>Já possui uma conta?</Text>
          <Text style={styles.loginLink}>Faça login</Text>
        </TouchableOpacity>
      </AppCard>

      <Text style={styles.disclaimer}>
        Projeto educacional de curricularização da extensão UNC — não substitui prontuário oficial ou atendimento médico.
      </Text>

      <AppModal
        visible={termosModalVisible}
        title="Termos de Uso e Privacidade (LGPD)"
        onClose={() => setTermosModalVisible(false)}
        footer={
          <AppButton
            title="Entendi e Aceito"
            variant="primary"
            onPress={() => {
              setAceitouTermos(true);
              setTermosModalVisible(false);
            }}
          />
        }
      >
        <Text style={styles.modalParagraph}>
          1. Finalidade: O aplicativo Meu App de Saúde é uma iniciativa de extensão universitária da UNC voltada ao autocuidado em saúde. Ele não realiza diagnósticos e não substitui atendimento presencial.
        </Text>
        <Text style={styles.modalParagraph}>
          2. Dados tratados: Os registros corporais, sinais vitais, medicamentos, dor, humor e avaliações ficam armazenados no seu aparelho e, quando autenticado, sincronizados com proteção por usuário no Supabase.
        </Text>
        <Text style={styles.modalParagraph}>
          3. Seus direitos: Você pode atualizar ou excluir definitivamente sua conta e todo o histórico clínico a qualquer momento na tela de Configurações.
        </Text>
      </AppModal>
    </ScreenShell>
  );
}
