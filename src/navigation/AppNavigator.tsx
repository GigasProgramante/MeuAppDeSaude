import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TelaInicial from '../screens/Inicial';
import TelaSinaisVitais from '../screens/SinaisVitais';
import TelaHumor from '../screens/Humor';
import TelaLembretes from '../screens/Lembretes';
import TelaLogin from '../screens/Login';
import TelaCadastro from '../screens/Cadastro';
import TelaPerfil, { CorpoMovimentoTab } from '../screens/Perfil';
import TelaFisioterapia from '../screens/Fisioterapia';
import TelaConfiguracoes from '../screens/Configuracoes';
import TelaSobreUNC from '../screens/SobreUNC';
import TelaRedefinirSenha from '../screens/RedefinirSenha';
import { extrairTokensRecuperacaoUrl } from '../services/authRecovery';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { flushSyncQueue, GUEST_CONTEXT_KEY } from '../services/sync';
import { useStore } from '../store/useStore';

export type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  RedefinirSenha: undefined;
  Perfil: { initialTab?: CorpoMovimentoTab } | undefined;
  Inicial: undefined;
  SinaisVitais: undefined;
  Humor: undefined;
  Lembretes: undefined;
  Fisioterapia: undefined;
  Configuracoes: undefined;
  SobreUNC: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function AppNavigator() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Inicial' | 'RedefinirSenha'>('Login');

  useEffect(() => {
    let isMounted = true;

    const processarDeepLinkRecuperacao = async (url?: string | null): Promise<boolean> => {
      const info = extrairTokensRecuperacaoUrl(url);
      if (!info.isRecovery) return false;

      if (isSupabaseConfigured && info.accessToken && info.refreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: info.accessToken,
            refresh_token: info.refreshToken,
          });
        } catch (err) {
          console.warn('Falha ao restaurar sessão de recuperação:', err);
        }
      }

      if (navigationRef.isReady()) {
        navigationRef.navigate('RedefinirSenha');
      }
      return true;
    };

    const inicializarSessao = async () => {
      try {
        await useStore.getState().hydrateStore();

        const initialUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();
        const veioDeRecuperacao = await processarDeepLinkRecuperacao(initialUrl);

        if (!isSupabaseConfigured) {
          await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
          if (isMounted) setInitialRoute(veioDeRecuperacao ? 'RedefinirSenha' : 'Login');
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        if (veioDeRecuperacao) {
          setInitialRoute('RedefinirSenha');
        } else if (session?.user) {
          setInitialRoute('Inicial');
          void useStore.getState().syncWithCloud(session.user.id);
        } else {
          await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
          setInitialRoute('Login');
        }
      } catch {
        if (isMounted) setInitialRoute('Login');
      } finally {
        if (isMounted) setSessionChecked(true);
      }
    };

    void inicializarSessao();

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      void processarDeepLinkRecuperacao(url);
    });

    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false;
        linkingSub.remove();
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (navigationRef.isReady()) {
          navigationRef.navigate('RedefinirSenha');
        } else {
          setInitialRoute('RedefinirSenha');
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        void useStore.getState().syncWithCloud(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        void useStore.getState().logout();
        if (navigationRef.isReady()) {
          const current = navigationRef.getCurrentRoute()?.name;
          if (current !== 'Login' && current !== 'Cadastro' && current !== 'RedefinirSenha') {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      }
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const ctx = useStore.getState().activeContextKey;
        if (ctx && ctx !== GUEST_CONTEXT_KEY) {
          void flushSyncQueue(ctx);
        }
      }
    });

    return () => {
      isMounted = false;
      linkingSub.remove();
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  if (!sessionChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#0F3A60" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F7FA' } }}
      >
        <Stack.Screen name="Login" component={TelaLogin} />
        <Stack.Screen name="Cadastro" component={TelaCadastro} />
        <Stack.Screen name="RedefinirSenha" component={TelaRedefinirSenha} />
        <Stack.Screen name="Perfil" component={TelaPerfil} />
        <Stack.Screen name="Inicial" component={TelaInicial} />
        <Stack.Screen name="SinaisVitais" component={TelaSinaisVitais} />
        <Stack.Screen name="Humor" component={TelaHumor} />
        <Stack.Screen name="Lembretes" component={TelaLembretes} />
        <Stack.Screen name="Fisioterapia" component={TelaFisioterapia} />
        <Stack.Screen name="Configuracoes" component={TelaConfiguracoes} />
        <Stack.Screen name="SobreUNC" component={TelaSobreUNC} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
