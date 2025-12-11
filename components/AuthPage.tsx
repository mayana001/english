// components/AuthPage.tsx
import React from 'react';
import { Language, AppTheme } from '../types';

interface AuthPageProps {
  language: Language;
  onLogin: (profile: any) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  language, 
  onLogin, 
  theme, 
  setTheme 
}) => {
  return (
    <div className="auth-page">
      <h1>Auth Page</h1>
      <button onClick={() => onLogin({ id: 'temp', username: 'test' })}>
        Login
      </button>
    </div>
  );
};

// Или если нужен default export:
// export default AuthPage;
