import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useStore } from '../../store/useStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { salvarPerfil } from '../../services/db';
import { aplicarMascaraTelefone, avaliarForcaSenha } from '../../services/authRecovery';
import { GUEST_CONTEXT_KEY } from '../../services/sync';
import { styles } from './styles';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cadastro'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export default function RegisterScreen({ navigation }: Props) {
  const [nome, setNome] = useState('');
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosModalVisible, setTermosModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const forcaSenha = password ? avaliarForcaSenha(password) : null;

  const mostrarAlerta = (titulo: string, mensagem: string, onOk?: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${titulo}\n\n${mensagem}`);
      if (onOk) onOk();
      return;
    }

    Alert.alert(titulo, mensagem, [{ text: 'OK', onPress: onOk }]);
  };

  const handleRegister = async () => {
    if (!emailOrCpf.trim() || !phone.trim() || !password || !confirmPassword) {
      mostrarAlerta('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password !== confirmPassword) {
      mostrarAlerta('Erro', 'As senhas não coincidem.');
      return;
    }

    const emailLimpo = emailOrCpf.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo);
    if (!emailValido) {
      mostrarAlerta('Atenção', 'Informe um endereço de e-mail válido (ex: nome@email.com).');
      return;
    }

    if (password.length < 6) {
      mostrarAlerta('Atenção', 'A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (!aceitouTermos) {
      mostrarAlerta(
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
          mostrarAlerta('Erro no Cadastro', error.message);
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
          mostrarAlerta('Sucesso', 'Cadastro realizado e perfil inicial criado!', () =>
            navigation.reset({ index: 0, routes: [{ name: 'Inicial' }] })
          );
        } else {
          mostrarAlerta(
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

    // Modo local / demonstração offline
    await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
    useStore.getState().updatePerfil({
      ...(nome.trim() ? { nome: nome.trim() } : {}),
      telefone: phone.trim(),
      termosAceitosEm,
    });

    mostrarAlerta(
      'Cadastro Local Salvo',
      'Seus dados e aceite de privacidade foram salvos neste aparelho (modo offline). Para sincronizar na nuvem, configure o Supabase.',
      () => navigation.reset({ index: 0, routes: [{ name: 'Inicial' }] })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.topBackBtn}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Voltar"
      >
        <Ionicons name="arrow-back" size={28} color="#1F2937" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: 100, height: 100, resizeMode: 'contain' }}
          />
        </View>
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>Preencha seus dados para começar.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput
            placeholderTextColor="#6B7280"
            style={styles.input}
            placeholder="Seu nome"
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>E-mail *</Text>
          <TextInput
            placeholderTextColor="#6B7280"
            style={styles.input}
            placeholder="Seu e-mail (ex: nome@email.com)"
            value={emailOrCpf}
            onChangeText={setEmailOrCpf}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefone *</Text>
          <TextInput
            placeholderTextColor="#6B7280"
            style={styles.input}
            placeholder="(47) 99999-9999"
            value={phone}
            onChangeText={(txt) => setPhone(aplicarMascaraTelefone(txt))}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Senha *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholderTextColor="#6B7280"
              style={styles.passwordInput}
              placeholder="Crie uma senha (mín. 6 caracteres)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#374151"
              />
            </TouchableOpacity>
          </View>
          {forcaSenha && (
            <Text style={[styles.strengthText, { color: forcaSenha.cor }]}>
              {forcaSenha.label}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirmar Senha *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholderTextColor="#6B7280"
              style={styles.passwordInput}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((v) => !v)}
              accessibilityLabel={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#374151"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Consentimento obrigatório LGPD */}
        <View style={styles.lgpdBox}>
          <TouchableOpacity
            style={styles.lgpdRow}
            onPress={() => setAceitouTermos((prev) => !prev)}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceitouTermos }}
          >
            <View style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}>
              {aceitouTermos && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </View>
            <Text style={styles.lgpdText}>
              Li e concordo com os Termos de Uso e a Política de Privacidade (LGPD), autorizando o armazenamento dos meus dados pessoais de saúde para meu acompanhamento.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.termsLinkBtn}
            onPress={() => setTermosModalVisible(true)}
          >
            <Text style={styles.termsLinkText}>Ler resumo dos Termos e Privacidade</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.registerButton, (loading || !aceitouTermos) && { opacity: 0.65 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerButtonText}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>
            Já tem uma conta? <Text style={styles.boldText}>Faça Login</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          Este aplicativo é uma ferramenta de autocuidado e apoio educativo (UNC). Não substitui atendimento médico nem serviços de emergência.
        </Text>
      </ScrollView>

      {/* Modal Resumo dos Termos & Política de Privacidade (LGPD) */}
      <Modal
        visible={termosModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTermosModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Termos de Uso e Privacidade (LGPD)</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBody}>
                1. Finalidade: O Meu App de Saúde é um projeto de extensão universitária (UNC) destinado ao acompanhamento pessoal e educativo de hábitos, sinais vitais, medicamentos, humor e dores.
              </Text>
              <Text style={styles.modalBody}>
                2. Aviso Clínico: Este aplicativo não realiza diagnósticos médicos, não prescreve tratamentos e não substitui atendimento presencial nem serviços de emergência (SAMU 192 / CVV 188).
              </Text>
              <Text style={styles.modalBody}>
                3. Dados Coletados e Armazenamento: Seus registros ficam armazenados localmente no dispositivo e, quando autenticado em conta configurada, sincronizados com isolamento individual (Row Level Security).
              </Text>
              <Text style={styles.modalBody}>
                4. Seus Direitos (LGPD): Você pode consultar, editar e exportar seus dados em PDF ou solicitar a exclusão definitiva de sua conta e registros a qualquer momento na tela de Configurações.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAcceptBtn}
              onPress={() => {
                setAceitouTermos(true);
                setTermosModalVisible(false);
              }}
            >
              <Text style={styles.modalAcceptText}>Aceitar e Continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setTermosModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
