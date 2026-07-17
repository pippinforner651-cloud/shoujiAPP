import { useState, useSyncExternalStore } from 'react';
import { store } from './lib/store';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import RunPage from './pages/RunPage';
import RankPage from './pages/RankPage';
import ProfilePage from './pages/ProfilePage';

type Tab = 'map' | 'run' | 'rank' | 'me';

export default function App() {
  useSyncExternalStore((f) => store.subscribe(f), () => store.version);
  const [tab, setTab] = useState<Tab>('map');

  if (!store.user) {
    return (
      <div className="mx-auto max-w-md h-[100dvh] shadow-2xl">
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md h-[100dvh] flex flex-col bg-white shadow-2xl relative overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        {tab === 'map' && <MapPage />}
        {tab === 'run' && <RunPage />}
        {tab === 'rank' && <RankPage />}
        {tab === 'me' && <ProfilePage />}
      </div>
      <nav className="shrink-0 bg-white border-t border-slate-100 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        <NavBtn active={tab === 'map'} onClick={() => setTab('map')} icon="🗺️" label="中国地图" />
        <NavBtn active={tab === 'run'} onClick={() => setTab('run')} icon="🏃" label="跑步" accent />
        <NavBtn active={tab === 'rank'} onClick={() => setTab('rank')} icon="🏆" label="排行榜" />
        <NavBtn active={tab === 'me'} onClick={() => setTab('me')} icon="👤" label="我的" />
      </nav>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label, accent }: { active: boolean; onClick: () => void; icon: string; label: string; accent?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center py-2 gap-0.5">
      <span className={`text-xl ${accent ? 'w-11 h-11 -mt-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-4 ring-white' : ''}`}>{icon}</span>
      <span className={`text-[11px] ${active ? 'text-orange-600 font-bold' : 'text-slate-400'}`}>{label}</span>
    </button>
  );
}
