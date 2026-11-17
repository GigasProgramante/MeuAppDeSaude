import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { avaliarForcaSenha } from '../../services/authRecovery';
import { styles } from './styles';

type RedefinirSenhaNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RedefinirSenha'
>;

interface Props {
  navigation: RedefinirSenhaNavigationProp;
}

export default function RedefinirSenhaScreen({ navigation }: Props) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const forca = novaSenha ? avaliarForcaSenha(novaSenha) : null;

  const mostrarAlerta = (titulo: string, mensagem: string, onOk?: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${titulo}\n\n${mensagem}`);
      if (onOk) onOk();
      return;
    }
    Alert.alert(titulo, mensagem, [{ text: 'OK', onPress: onOk }]);
  };

  const handleConfirmarNovaSenha = async () => {
    if (novaSenha.length < 6) {
      mostrarAlerta('Atenção', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      mostrarAlerta('Atenção', 'As senhas digitadas não coincidem.');
      return;
    }
    if (!isSupabaseConfigured) {
      mostrarAlerta(
        'Ambiente Local',
        'Configure o Supabase no .env para concluir a redefinição de senha na nuvem.',
        () => navigation.replace('Login')
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        mostrarAlerta('Erro ao Redefinir', error.message);
        return;
      }

      mostrarAlerta('Senha Atualizada', 'Sua nova senha foi salva com sucesso!', () => {
        navigation.reset({ index: 0, routes: [{ name: 'Inicial' }] });
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Definir Nova Senha</Text>
          <Text style={styles.subtitle}>
            Crie uma nova senha de acesso para continuar usando sua conta com segurança.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nova Senha *</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#64748B"
                value={novaSenha}
                onChangeText={setNovaSenha}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass((v) => !v)}
                accessibilityLabel={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={22} color="#334155" />
              </TouchableOpacity>
            </View>
            {forca && <Text style={[styles.strengthText, { color: forca.cor }]}>{forca.label}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Nova Senha *</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Repita a nova senha"
                placeholderTextColor="#64748B"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
                accessibilityLabel={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleConfirmarNovaSenha}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Salvar Nova Senha</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.replace('Login')}
            disabled={loading}
          >
            <Text style={styles.secondaryBtnText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
