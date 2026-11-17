import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { FeedbackProvider } from './src/components/ui';
import { configureNotificationHandler } from './src/services/notifications';

// Inicializa a configuração das notificações em foreground de forma limpa e centralizada
configureNotificationHandler();

export default function App() {
  return (
    <FeedbackProvider>
      <AppNavigator />
    </FeedbackProvider>
  );
}
