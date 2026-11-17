import React, { useEffect, useState } from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
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
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useStore } from '../../store/useStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { salvarPerfil, uploadAvatar } from '../../services/db';
import {
  aplicarMascaraTelefone,
  avaliarForcaSenha,
  getPasswordResetRedirectUrl,
} from '../../services/authRecovery';
import { cancelAllNotifications } from '../../services/notifications';
import { GUEST_CONTEXT_KEY } from '../../services/sync';
import { colors, spacing } from '../../theme/tokens';
import { styles } from './styles';

type ConfiguracoesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Configuracoes'
>;

interface Props {
  navigation: ConfiguracoesScreenNavigationProp;
}

export default function TelaConfiguracoes({ navigation }: Props) {
  const { showAlert, showToast } = useFeedback();
  const { perfil, updatePerfil, logout, wipeContext } = useStore();

  const [nome, setNome] = useState(perfil?.nome || '');
  const [telefone, setTelefone] = useState(perfil?.telefone || '');
  const [fotoUri, setFotoUri] = useState<string | null>(perfil?.fotoUri || null);

  const [authEmail, setAuthEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverModalVisible, setRecoverModalVisible] = useState(false);

  const [changePassModalVisible, setChangePassModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const email = data?.user?.email || '';
        setAuthEmail(email);
        setRecoveryEmail((prev) => prev || email);
      })
      .catch(() => {});
  }, []);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showAlert('Permissão Negada', 'Precisamos de permissão para acessar sua galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let finalFotoUri = fotoUri;

    try {
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          if (fotoUri && !fotoUri.startsWith('http')) {
            const uploadedUrl = await uploadAvatar(user.id, fotoUri);
            if (uploadedUrl) {
              finalFotoUri = uploadedUrl;
              setFotoUri(uploadedUrl);
            }
          }
          try {
            await salvarPerfil(user.id, { nome, telefone, fotoUri: finalFotoUri });
          } catch (err) {
            console.warn('Erro ao sincronizar configurações com o Supabase:', err);
          }
        }
      }

      updatePerfil({ nome, telefone, fotoUri: finalFotoUri });
      showToast('Configurações salvas com sucesso!', 'success');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRecoverModal = () => {
    if (!recoveryEmail && authEmail) {
      setRecoveryEmail(authEmail);
    }
    setRecoverModalVisible(true);
  };

  const handleSendPasswordReset = async () => {
    const emailLimpo = recoveryEmail.trim();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      showAlert('Atenção', 'Informe um endereço de e-mail válido para enviar o link.');
      return;
    }

    if (!isSupabaseConfigured) {
      setRecoverModalVisible(false);
      showAlert(
        'Modo Demonstração Local',
        `Para disparar o e-mail real de redefinição para ${emailLimpo}, configure as credenciais do Supabase no arquivo .env.`
      );
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (error) {
        showAlert('Erro ao Enviar', error.message);
        return;
      }

      setRecoverModalVisible(false);
      showAlert(
        'E-mail Enviado',
        `As instruções para redefinição de senha foram enviadas para ${emailLimpo}.`
      );
    } finally {
      setSendingReset(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      showAlert('Atenção', 'A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert('Atenção', 'As senhas digitadas não coincidem.');
      return;
    }
    if (!isSupabaseConfigured) {
      setChangePassModalVisible(false);
      showAlert(
        'Modo Local',
        'A troca de senha na nuvem requer configuração do Supabase no arquivo .env.'
      );
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showAlert('Erro ao Alterar Senha', error.message);
        return;
      }
      setChangePassModalVisible(false);
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Sua senha foi alterada com sucesso.', 'success');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const abrirModalExclusao = () => {
    setDeleteStep(1);
    setDeleteConfirmText('');
    setDeleteModalVisible(true);
  };

  const handleConfirmarExclusaoDefinitiva = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') {
      showAlert('Confirmação necessária', 'Digite a palavra EXCLUIR para confirmar.');
      return;
    }

    setDeletingAccount(true);
    try {
      const ctxAtual = useStore.getState().activeContextKey;

      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const { error: fnError } = await supabase.functions.invoke('delete-account');
          if (fnError) {
            showAlert(
              'Falha na Exclusão na Nuvem',
              `Não foi possível concluir a exclusão no servidor (${fnError.message}). Verifique se a Edge Function delete-account está implantada.`
            );
            return;
          }
        }
        try {
          await supabase.auth.signOut();
        } catch {
          // Sessão já removida no servidor
        }
      }

      if (Platform.OS !== 'web') {
        try {
          await cancelAllNotifications();
        } catch {
          // Ignora falha ao limpar notificações
        }
      }

      await wipeContext(ctxAtual);
      if (ctxAtual !== GUEST_CONTEXT_KEY) {
        await wipeContext(GUEST_CONTEXT_KEY);
      }

      setDeleteModalVisible(false);
      showAlert(
        'Conta e Dados Excluídos',
        'Todos os seus registros foram removidos definitivamente conforme a LGPD.',
        () => {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Erro ao encerrar sessão no Supabase:', err);
      }
    }

    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const passStrength = newPassword ? avaliarForcaSenha(newPassword) : null;

  return (
    <ScreenShell
      title="Configurações"
      subtitle={authEmail ? `Conta conectada: ${authEmail}` : 'Modo local no aparelho (Acesso Rápido)'}
      maxWidth="form"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.sectionsStack}>
        <AppCard variant="elevated">
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="person-circle-outline" size={22} color={colors.brand.primary} />
              <Text style={styles.sectionTitle}>Meus Dados</Text>
            </View>
            <StatusBadge
              label={authEmail ? 'Conta Nuvem' : 'Local'}
              tone={authEmail ? 'info' : 'neutral'}
            />
          </View>

          <TouchableOpacity style={styles.avatarArea} onPress={handlePickImage} activeOpacity={0.8}>
            <View style={styles.avatarFrame}>
              {fotoUri ? (
                <Image source={{ uri: fotoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={34} color={colors.text.secondary} />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color={colors.text.inverse} />
              </View>
            </View>
            <Text style={styles.changePhotoText}>Alterar foto de perfil</Text>
          </TouchableOpacity>

          <AppInput
            label="Nome"
            placeholder="Seu nome completo"
            value={nome}
            onChangeText={setNome}
          />

          <AppInput
            label="Telefone"
            placeholder="(47) 99999-9999"
            value={telefone}
            onChangeText={(txt) => setTelefone(aplicarMascaraTelefone(txt))}
            keyboardType="phone-pad"
            maxLength={15}
          />

          <AppButton
            title="Salvar Alterações"
            icon="save-outline"
            variant="primary"
            loading={saving}
            onPress={handleSave}
          />
        </AppCard>

        <AppCard variant="default">
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand.teal} />
              <Text style={styles.sectionTitle}>Segurança e Privacidade</Text>
            </View>
          </View>

          <View style={styles.buttonStack}>
            <AppButton
              title="Alterar Senha da Conta"
              icon="lock-closed-outline"
              variant="outline"
              onPress={() => setChangePassModalVisible(true)}
            />
            <AppButton
              title="Enviar E-mail de Recuperação"
              icon="mail-outline"
              variant="outline"
              onPress={handleOpenRecoverModal}
            />
            <AppButton
              title="Excluir Minha Conta e Dados (LGPD)"
              icon="trash-outline"
              variant="danger"
              onPress={abrirModalExclusao}
            />
          </View>
        </AppCard>

        <AppCard variant="default">
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="school-outline" size={22} color={colors.brand.primary} />
              <Text style={styles.sectionTitle}>Institucional e Sessão</Text>
            </View>
          </View>

          <View style={styles.buttonStack}>
            <AppButton
              title="Sobre a UNC e Clínicas-Escola"
              icon="medkit-outline"
              variant="secondary"
              onPress={() => navigation.navigate('SobreUNC')}
            />
            <AppButton
              title={authEmail ? 'Sair da Conta' : 'Sair do Acesso Rápido'}
              icon="log-out-outline"
              variant="outline"
              onPress={handleLogout}
            />
          </View>

          <Text style={styles.disclaimer}>
            Aplicativo educacional de curricularização da extensão da Universidade do Contestado (UNC). O app apoia o acompanhamento pessoal e não substitui prontuário oficial ou avaliação profissional.
          </Text>
        </AppCard>
      </View>

      <AppModal
        visible={recoverModalVisible}
        title="Recuperação de Senha"
        subtitle="Informe seu e-mail cadastrado para receber o link de redefinição."
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
          label="E-mail"
          placeholder="seu@email.com"
          value={recoveryEmail}
          onChangeText={setRecoveryEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </AppModal>

      <AppModal
        visible={changePassModalVisible}
        title="Alterar Senha"
        subtitle="Escolha uma senha com pelo menos 6 caracteres."
        onClose={() => setChangePassModalVisible(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              title="Cancelar"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => setChangePassModalVisible(false)}
            />
            <AppButton
              title="Salvar Senha"
              variant="primary"
              loading={updatingPassword}
              style={{ flex: 1 }}
              onPress={handleUpdatePassword}
            />
          </View>
        }
      >
        <AppInput
          label="Nova senha *"
          placeholder="Mínimo 6 caracteres"
          value={newPassword}
          onChangeText={setNewPassword}
          isPassword
        />

        {passStrength && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthBarTrack}>
              <View
                style={[
                  styles.strengthBarFill,
                  {
                    width:
                      passStrength.nivel === 'fraca'
                        ? '33%'
                        : passStrength.nivel === 'media'
                          ? '66%'
                          : '100%',
                    backgroundColor: passStrength.cor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthLabel, { color: passStrength.cor }]}>
              Força da senha: {passStrength.label}
            </Text>
          </View>
        )}

        <AppInput
          label="Confirmar nova senha *"
          placeholder="Repita a nova senha"
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          isPassword
        />
      </AppModal>

      <AppModal
        visible={deleteModalVisible}
        title="Excluir Conta e Dados (LGPD)"
        onClose={() => setDeleteModalVisible(false)}
        footer={
          deleteStep === 1 ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppButton
                title="Cancelar"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setDeleteModalVisible(false)}
              />
              <AppButton
                title="Continuar"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => setDeleteStep(2)}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppButton
                title="Voltar"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setDeleteStep(1)}
              />
              <AppButton
                title="Excluir Definitivamente"
                variant="danger"
                loading={deletingAccount}
                style={{ flex: 1 }}
                onPress={handleConfirmarExclusaoDefinitiva}
              />
            </View>
          )
        }
      >
        {deleteStep === 1 ? (
          <View>
            <View style={styles.deleteWarningBox}>
              <Text style={styles.deleteWarningText}>
                Esta ação é irreversível e apaga todos os seus dados clínicos, lembretes, medicamentos, histórico de humor e conta vinculada.
              </Text>
            </View>
            <Text style={styles.modalText}>
              Deseja continuar para a confirmação final da exclusão definitiva?
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.modalText}>
              Para confirmar a exclusão definitiva da conta e de todos os dados locais e em nuvem, digite EXCLUIR no campo abaixo:
            </Text>
            <AppInput
              label="Confirmação"
              placeholder="Digite EXCLUIR"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />
          </View>
        )}
      </AppModal>
    </ScreenShell>
  );
}
