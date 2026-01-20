import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppNavigator } from '../components/navigation';
import { ThemeProvider } from '../theme';
import i18n from '../i18n';

export const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </I18nextProvider>
  );
};

export default App;
