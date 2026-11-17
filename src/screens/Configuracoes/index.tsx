import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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
import { styles } from './styles';

type ConfiguracoesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Configuracoes'>;

interface Props {
  navigation: ConfiguracoesScreenNavigationProp;
}

export default function TelaConfiguracoes({ navigation }: Props) {
  const { perfil, updatePerfil, logout, wipeContext } = useStore();

  const [nome, setNome] = useState(perfil?.nome || '');
  const [telefone, setTelefone] = useState(perfil?.telefone || '');
  const [fotoUri, setFotoUri] = useState<string | null>(perfil?.fotoUri || null);

  const [authEmail, setAuthEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverModalVisible, setRecoverModalVisible] = useState(false);

  // Troca de senha autenticado
  const [changePassModalVisible, setChangePassModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Exclusão definitiva LGPD com dupla confirmação
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

  const mostrarAlerta = (titulo: string, mensagem: string, onOk?: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${titulo}\n\n${mensagem}`);
      if (onOk) onOk();
      return;
    }

    Alert.alert(titulo, mensagem, [{ text: 'OK', onPress: onOk }]);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      mostrarAlerta('Permissão Negada', 'Precisamos de permissão para acessar sua galeria.');
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
      mostrarAlerta('Sucesso', 'Configurações salvas com sucesso!', () => navigation.goBack());
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
      mostrarAlerta('Atenção', 'Informe um endereço de e-mail válido para enviar o link.');
      return;
    }

    if (!isSupabaseConfigured) {
      setRecoverModalVisible(false);
      mostrarAlerta(
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
        mostrarAlerta('Erro ao Enviar', error.message);
        return;
      }

      setRecoverModalVisible(false);
      mostrarAlerta(
        'E-mail Enviado',
        `As instruções para redefinição de senha foram enviadas para ${emailLimpo}.`
      );
    } finally {
      setSendingReset(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      mostrarAlerta('Atenção', 'A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      mostrarAlerta('Atenção', 'As senhas digitadas não coincidem.');
      return;
    }
    if (!isSupabaseConfigured) {
      setChangePassModalVisible(false);
      mostrarAlerta(
        'Modo Local',
        'A troca de senha na nuvem requer configuração do Supabase no arquivo .env.'
      );
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        mostrarAlerta('Erro ao Alterar Senha', error.message);
        return;
      }
      setChangePassModalVisible(false);
      setNewPassword('');
      setConfirmNewPassword('');
      mostrarAlerta('Senha Atualizada', 'Sua senha foi alterada com sucesso.');
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
      mostrarAlerta('Confirmação necessária', 'Digite a palavra EXCLUIR para confirmar.');
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
            mostrarAlerta(
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
      mostrarAlerta(
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Configurações</Text>
        {authEmail ? (
          <Text style={styles.accountSubtitle}>Conta conectada: {authEmail}</Text>
        ) : (
          <Text style={styles.accountSubtitle}>Modo local no aparelho (sem conta conectada)</Text>
        )}

        <TouchableOpacity style={styles.photoContainer} onPress={handlePickImage} activeOpacity={0.8}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={40} color="#4B5563" />
            </View>
          )}
          <Text style={styles.changePhotoText}>Alterar Foto</Text>
        </TouchableOpacity>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            placeholderTextColor="#6B7280"
            style={styles.input}
            placeholder="Seu nome completo"
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            placeholderTextColor="#6B7280"
            style={styles.input}
            placeholder="(47) 99999-9999"
            value={telefone}
            onChangeText={(txt) => setTelefone(aplicarMascaraTelefone(txt))}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>

        {authEmail ? (
          <TouchableOpacity
            style={styles.changePassButton}
            onPress={() => setChangePassModalVisible(true)}
          >
            <Text style={styles.changePassButtonText}>Alterar Senha Atual</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.recoverButton} onPress={handleOpenRecoverModal}>
          <Text style={styles.recoverButtonText}>Recuperar Senha por E-mail</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.aboutUncButton} onPress={() => navigation.navigate('SobreUNC')}>
          <Text style={styles.aboutUncButtonText}>Serviços da UNC à Comunidade</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair do Aplicativo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={abrirModalExclusao}>
          <Text style={styles.deleteAccountButtonText}>Excluir Conta e Dados (LGPD)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          Este aplicativo é uma ferramenta de autocuidado e apoio educativo (UNC). Não substitui atendimento médico nem serviços de emergência.
        </Text>
      </ScrollView>

      {/* Modal Alterar Senha Logado */}
      <Modal
        visible={changePassModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePassModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alterar Senha</Text>
            <Text style={styles.modalSubtitle}>
              Defina uma nova senha para sua conta ({authEmail}).
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nova senha (mín. 6 caracteres)"
                placeholderTextColor="#6B7280"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPass}
              />
              <TouchableOpacity
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowNewPass((v) => !v)}
              >
                <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            {passStrength ? (
              <Text style={{ fontSize: 13, fontWeight: '700', color: passStrength.cor, marginBottom: 10 }}>
                {passStrength.label}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Confirme a nova senha"
              placeholderTextColor="#6B7280"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry={!showNewPass}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setChangePassModalVisible(false)}
                disabled={updatingPassword}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, updatingPassword && { opacity: 0.7 }]}
                onPress={handleUpdatePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Salvar Senha</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Recuperação de Senha (Supabase resetPasswordForEmail) */}
      <Modal
        visible={recoverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecoverModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Recuperar Senha</Text>
            <Text style={styles.modalSubtitle}>
              Informe o e-mail da sua conta para enviarmos o link de redefinição de senha.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#6B7280"
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRecoverModalVisible(false)}
                disabled={sendingReset}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, sendingReset && { opacity: 0.7 }]}
                onPress={handleSendPasswordReset}
                disabled={sendingReset}
              >
                {sendingReset ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enviar Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Exclusão Definitiva de Conta e Dados (Dupla Confirmação LGPD) */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingAccount && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: '#B91C1C' }]}>
              Excluir Conta e Dados (LGPD)
            </Text>

            {deleteStep === 1 ? (
              <>
                <Text style={styles.modalSubtitle}>
                  Esta ação é permanente e irreversível. Todos os seus dados pessoais, perfil, sinais vitais, lembretes, medicamentos, histórico emocional, dor e treinos serão apagados definitivamente.
                </Text>
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dangerConfirmBtn}
                    onPress={() => setDeleteStep(2)}
                  >
                    <Text style={styles.modalConfirmText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Segunda confirmação: digite a palavra EXCLUIR abaixo para apagar sua conta e todos os registros.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite EXCLUIR"
                  placeholderTextColor="#6B7280"
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  autoCapitalize="characters"
                />
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                    disabled={deletingAccount}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dangerConfirmBtn,
                      (deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') && {
                        opacity: 0.6,
                      },
                    ]}
                    onPress={handleConfirmarExclusaoDefinitiva}
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Excluir Tudo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
