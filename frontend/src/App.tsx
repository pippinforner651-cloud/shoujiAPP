import { useState, useEffect } from 'react';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import MainApp from './MainApp';
import { useUserStore } from './store/userStore';
import './App.css';

type AppRoute = 'splash' | 'login' | 'register' | 'home';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('splash');
  const { account, initialize } = useUserStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Splash 完成后判断登录状态
  const handleSplashFinish = () => {
    if (account.isLogin) {
      setRoute('home');
    } else {
      setRoute('login');
    }
  };

  if (route === 'splash') {
    return <Splash onFinish={handleSplashFinish} />;
  }

  if (route === 'login') {
    return (
      <Login
        onGoToRegister={() => setRoute('register')}
        onLoginSuccess={() => setRoute('home')}
      />
    );
  }

  if (route === 'register') {
    return (
      <Register
        onBackToLogin={() => setRoute('login')}
        onRegisterSuccess={() => setRoute('home')}
      />
    );
  }

  if (route === 'home') {
    return (
      <MainApp
        onLogout={() => {
          useUserStore.getState().logout();
          setRoute('login');
        }}
      />
    );
  }

  return null;
}
