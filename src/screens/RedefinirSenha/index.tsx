import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppButton,
  AppCard,
  AppInput,
  ScreenShell,
  useFeedback,
} from '../../components/ui';
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
  const { showAlert } = useFeedback();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const forca = novaSenha ? avaliarForcaSenha(novaSenha) : null;

  const handleConfirmarNovaSenha = async () => {
    if (novaSenha.length < 6) {
      showAlert('Atenção', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      showAlert('Atenção', 'As senhas digitadas não coincidem.');
      return;
    }
    if (!isSupabaseConfigured) {
      showAlert(
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
        showAlert('Erro ao Redefinir', error.message);
        return;
      }

      showAlert('Senha Atualizada', 'Sua nova senha foi salva com sucesso!', () => {
        navigation.reset({ index: 0, routes: [{ name: 'Inicial' }] });
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      title="Definir Nova Senha"
      subtitle="Crie uma nova senha de acesso para proteger sua conta."
      maxWidth="form"
      onBack={() => navigation.replace('Login')}
    >
      <AppCard variant="elevated">
        <AppInput
          label="Nova Senha *"
          placeholder="Mínimo 6 caracteres"
          value={novaSenha}
          onChangeText={setNovaSenha}
          isPassword
        />

        {forca && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthBarTrack}>
              <View
                style={[
                  styles.strengthBarFill,
                  {
                    width:
                      forca.nivel === 'fraca' ? '33%' : forca.nivel === 'media' ? '66%' : '100%',
                    backgroundColor: forca.cor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthLabel, { color: forca.cor }]}>
              Força da senha: {forca.label}
            </Text>
          </View>
        )}

        <AppInput
          label="Confirmar Nova Senha *"
          placeholder="Repita a nova senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          isPassword
        />

        <View style={styles.actions}>
          <AppButton
            title="Salvar Nova Senha"
            icon="checkmark-circle-outline"
            variant="primary"
            loading={loading}
            onPress={handleConfirmarNovaSenha}
          />
          <AppButton
            title="Voltar ao Login"
            variant="ghost"
            onPress={() => navigation.replace('Login')}
          />
        </View>
      </AppCard>
    </ScreenShell>
  );
}
