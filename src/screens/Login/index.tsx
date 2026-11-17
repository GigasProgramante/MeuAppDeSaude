import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  ScreenShell,
  StatusBadge,
  useFeedback,
} from '../../components/ui';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { salvarPerfil } from '../../services/db';
import { getPasswordResetRedirectUrl } from '../../services/authRecovery';
import { GUEST_CONTEXT_KEY } from '../../services/sync';
import { useStore } from '../../store/useStore';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, spacing } from '../../theme/tokens';
import { styles } from './styles';

WebBrowser.maybeCompleteAuthSession();
type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'SEU_CLIENT_ID_WEB.apps.googleusercontent.com';
const isGoogleClientConfigured =
  Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) &&
  !GOOGLE_CLIENT_ID.includes('SEU_CLIENT_ID_WEB');

export default function LoginScreen({ navigation }: Props) {
  const { showAlert } = useFeedback();
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [recoverModalVisible, setRecoverModalVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (!isSupabaseConfigured) {
        showAlert('Aviso', 'Configure as variáveis do Supabase no arquivo .env para concluir o login Google.');
        return;
      }

      setLoading(true);
      supabase.auth
        .signInWithIdToken({
          provider: 'google',
          token: id_token,
        })
        .then(async ({ data, error }) => {
          if (error) {
            showAlert('Erro', 'Não foi possível fazer login com o Google no Supabase.');
            console.error(error);
            return;
          }

          if (data.user) {
            await useStore.getState().switchContext(data.user.id);
            const nomeGoogle =
              (data.user.user_metadata?.full_name as string | undefined) ||
              (data.user.user_metadata?.name as string | undefined) ||
              '';
            const avatarGoogle = (data.user.user_metadata?.avatar_url as string | undefined) || null;
            if (nomeGoogle || avatarGoogle) {
              useStore.getState().updatePerfil({
                ...(nomeGoogle ? { nome: nomeGoogle } : {}),
                ...(avatarGoogle ? { fotoUri: avatarGoogle } : {}),
              });
              try {
                await salvarPerfil(data.user.id, { nome: nomeGoogle, fotoUri: avatarGoogle });
              } catch {
                // Perfil inicial será sincronizado posteriormente se já existir
              }
            }
          }
          navigation.replace('Inicial');
        })
        .finally(() => setLoading(false));
    }
  }, [response, navigation, showAlert]);

  const handleLogin = async () => {
    if (!emailOrCpf.trim() || !password) {
      showAlert('Atenção', 'Preencha seu e-mail e senha para continuar.');
      return;
    }

    if (__DEV__ && emailOrCpf.trim().toLowerCase() === 'admin' && password.trim() === 'admin') {
      await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
      navigation.replace('Inicial');
      return;
    }

    if (isSupabaseConfigured) {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrCpf.trim().toLowerCase(),
          password: password.trim(),
        });

        if (error) {
          showAlert('Erro de Autenticação', error.message);
          return;
        }

        if (data.user) {
          await useStore.getState().syncWithCloud(data.user.id);
        }
        navigation.replace('Inicial');
      } finally {
        setLoading(false);
      }
    } else {
      showAlert(
        'Modo Local / Demonstração',
        __DEV__
          ? 'Credenciais inválidas. Em desenvolvimento use admin/admin, entre sem login (Acesso Rápido), ou configure o Supabase no arquivo .env.'
          : 'Autenticação em nuvem não configurada neste ambiente. Utilize "Entrar sem Login (Acesso Rápido)" para uso local no aparelho.'
      );
    }
  };

  const handleGoogleLogin = () => {
    if (!isSupabaseConfigured || !isGoogleClientConfigured) {
      showAlert(
        'Configuração Google OAuth Pendente',
        'Configure EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY e EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no arquivo .env para autenticar com Google.'
      );
      return;
    }
    void promptAsync();
  };

  const handleOpenRecover = () => {
    if (emailOrCpf.includes('@')) {
      setRecoveryEmail(emailOrCpf.trim());
    }
    setRecoverModalVisible(true);
  };

  const handleSendPasswordReset = async () => {
    const emailLimpo = recoveryEmail.trim();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      showAlert('Atenção', 'Informe um e-mail válido para recuperar a senha.');
      return;
    }

    if (!isSupabaseConfigured) {
      setRecoverModalVisible(false);
      showAlert(
        'Modo Demonstração Local',
        `Para enviar o link real de recuperação para ${emailLimpo}, configure o Supabase no arquivo .env.`
      );
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (error) {
        showAlert('Erro', error.message);
        return;
      }
      setRecoverModalVisible(false);
      showAlert(
        'E-mail Enviado',
        `Enviamos as instruções de recuperação de senha para ${emailLimpo}.`
      );
    } finally {
      setSendingReset(false);
    }
  };

  const handleGuestLogin = async () => {
    await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
    navigation.replace('Inicial');
  };

  return (
    <ScreenShell maxWidth="form">
      <View style={styles.heroBox}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} />
        <StatusBadge label="Curricularização da Extensão · UNC" tone="info" />
        <Text style={styles.title}>Meu App de Saúde</Text>
        <Text style={styles.subtitle}>
          Acompanhamento de bem-estar, medicações e autocuidado.
        </Text>
      </View>

      <AppCard variant="elevated">
        <AppInput
          label="E-mail"
          placeholder={__DEV__ ? 'seu@email.com (ou admin em dev)' : 'seu@email.com'}
          value={emailOrCpf}
          onChangeText={setEmailOrCpf}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <AppInput
          label="Senha"
          placeholder="Digite sua senha"
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        <TouchableOpacity style={styles.forgotRow} onPress={handleOpenRecover}>
          <Text style={styles.forgotText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <View style={styles.buttonStack}>
          <AppButton
            title="Entrar"
            icon="log-in-outline"
            variant="primary"
            loading={loading}
            onPress={handleLogin}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <AppButton
            title="Entrar com Google"
            icon="logo-google"
            variant="outline"
            disabled={isSupabaseConfigured && isGoogleClientConfigured ? !request || loading : false}
            onPress={handleGoogleLogin}
          />

          <AppButton
            title="Entrar sem Login (Acesso Rápido)"
            icon="flash-outline"
            variant="secondary"
            onPress={handleGuestLogin}
          />
        </View>

        <View style={styles.guestHintBox}>
          <Ionicons name="phone-portrait-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.guestHintText}>
            No Acesso Rápido, seus dados ficam salvos apenas neste aparelho, sem sincronização em nuvem.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.registerPrompt}
          onPress={() => navigation.navigate('Cadastro')}
        >
          <Text style={styles.registerMuted}>Não tem uma conta?</Text>
          <Text style={styles.registerLink}>Cadastre-se</Text>
        </TouchableOpacity>
      </AppCard>

      <Text style={styles.disclaimerText}>
        Aplicativo educacional de extensão universitária UNC. As informações aqui registradas apoiam o autocuidado e não substituem avaliação clínica presencial.
      </Text>

      <AppModal
        visible={recoverModalVisible}
        title="Recuperar Senha"
        subtitle="Informe seu e-mail cadastrado para receber as instruções de redefinição."
        onClose={() => setRecoverModalVisible(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              title="Cancelar"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => setRecoverModalVisible(false)}
            />
            <AppButton
              title="Enviar link"
              variant="primary"
              loading={sendingReset}
              style={{ flex: 1 }}
              onPress={handleSendPasswordReset}
            />
          </View>
        }
      >
        <AppInput
          label="E-mail da conta"
          placeholder="seu@email.com"
          value={recoveryEmail}
          onChangeText={setRecoveryEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </AppModal>
    </ScreenShell>
  );
}
