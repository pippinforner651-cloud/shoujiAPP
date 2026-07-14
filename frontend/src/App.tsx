import { useState, useEffect } from 'react';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import FirstRunGuide from './pages/FirstRunGuide';
import MainApp from './MainApp';
import { useUserStore } from './store/userStore';
import { useRunStore } from './store/runStore';
import { shouldShowFirstRunGuide } from './utils/authCore';
import './App.css';

type AppRoute = 'splash' | 'login' | 'register' | 'guide' | 'home';
const FIRST_RUN_GUIDE_KEY = 'e23_first_run_guide_v1';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('splash');
  const [initialTab, setInitialTab] = useState<'home' | 'run'>('home');
  const { account, initialize } = useUserStore();
  const initializeRuns = useRunStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    initializeRuns();
  }, [initialize, initializeRuns]);

  const routeAfterAuthentication = () => {
    const guideCompleted = localStorage.getItem(FIRST_RUN_GUIDE_KEY) === 'completed';
    const recordCount = useRunStore.getState().records.length;
    setRoute(shouldShowFirstRunGuide(guideCompleted, recordCount) ? 'guide' : 'home');
  };

  // Splash 完成后判断登录状态
  const handleSplashFinish = () => {
    if (account.isLogin) {
      routeAfterAuthentication();
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
        onLoginSuccess={routeAfterAuthentication}
      />
    );
  }

  if (route === 'register') {
    return (
      <Register
        onBackToLogin={() => setRoute('login')}
        onRegisterSuccess={routeAfterAuthentication}
      />
    );
  }

  if (route === 'guide') {
    const finishGuide = (tab: 'home' | 'run') => {
      localStorage.setItem(FIRST_RUN_GUIDE_KEY, 'completed');
      setInitialTab(tab);
      setRoute('home');
    };
    return <FirstRunGuide onStartRun={() => finishGuide('run')} onExploreHome={() => finishGuide('home')} />;
  }

  if (route === 'home') {
    return (
      <MainApp
        initialTab={initialTab}
        onLogout={() => {
          useUserStore.getState().logout();
          setRoute('login');
        }}
      />
    );
  }

  return null;
}
