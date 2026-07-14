import { useState } from 'react';
import { BRAND } from '../../config/brand';
import { useAchievementStore } from '../../store/achievementStore';
import { useCityStore } from '../../store/cityStore';
import { useProgressStore } from '../../store/progressStore';
import { useRunStore } from '../../store/runStore';
import { useUserStore } from '../../store/userStore';
import { analyzeStreak } from '../../services/activityAnalysis/streakAnalysis';
import E23BrandMark from '../E23BrandMark';
import E23Icon from '../E23Icon';

interface Props { onLogout: () => void; }

export default function MyProfile({ onLogout }: Props) {
  const { account, setNickname } = useUserStore();
  const { records, stats } = useRunStore();
  const progress = useProgressStore((state) => state.info);
  const cities = useCityStore((state) => state.unlockedCities);
  const achievements = useAchievementStore((state) => state.userAchievements);
  const level = useAchievementStore((state) => state.level);
  const [editing, setEditing] = useState(false);
  const [nickname, setNicknameInput] = useState(account.nickname);
  const [exported, setExported] = useState(false);
  const streak = analyzeStreak(records);
  const unlocked = achievements.filter((item) => item.unlocked).length;

  const saveNickname = () => {
    setNickname(nickname);
    setEditing(false);
  };

  const exportLocalData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: BRAND.APP_NAME,
      version: BRAND.VERSION,
      account: { nickname: account.nickname, phone: account.phone, loginType: account.loginType },
      records,
      cities,
      progress,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `E23-local-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  return (
    <div className="profile-v1">
      <header className="profile-identity-card">
        <E23BrandMark size={64} />
        <div><p className="section-kicker">我的旅程</p><h1>{account.nickname || 'E23跑者'}</h1><span>Lv.{level.level} · {level.title}</span></div>
        <button className="icon-action" aria-label="修改昵称" onClick={() => setEditing(true)}><E23Icon name="edit" size={19} /></button>
      </header>

      {editing && <section className="profile-edit-card"><label htmlFor="profile-nickname">昵称</label><div><input id="profile-nickname" value={nickname} maxLength={16} onChange={(event) => setNicknameInput(event.target.value)} /><button onClick={saveNickname}><E23Icon name="check" size={17} />保存</button></div></section>}

      <section className="profile-stat-grid">
        <article><strong>{stats.totalDistanceKm.toFixed(1)}</strong><span>实际公里</span></article>
        <article><strong>{progress.virtualKm.toLocaleString()}</strong><span>虚拟公里</span></article>
        <article><strong>{cities.length}/48</strong><span>到达城市</span></article>
        <article><strong>{streak.currentStreak}</strong><span>连续天数</span></article>
      </section>

      <section className="profile-journey-card">
        <div className="section-heading"><div><p className="section-kicker">当前路线</p><h2>{progress.currentCity?.city ?? '深圳'} <span>前往</span> {progress.nextCity?.city ?? '全程完成'}</h2></div><strong>{progress.completionRate.toFixed(1)}%</strong></div>
        <div className="journey-progress-track"><i style={{ width: `${progress.completionRate}%` }} /></div>
        <p>还需真实跑步 {progress.remainingToNextRealKm.toFixed(1)} km 到达下一站。</p>
      </section>

      <section className="profile-list-card">
        <div className="profile-list-row"><span><E23Icon name="run" size={20} /><b>跑步记录</b></span><strong>{records.length} 条</strong></div>
        <div className="profile-list-row"><span><E23Icon name="award" size={20} /><b>已达成成就</b></span><strong>{unlocked} 项</strong></div>
        <div className="profile-list-row"><span><E23Icon name="phone" size={20} /><b>登录方式</b></span><strong>本地测试账号</strong></div>
        <div className="profile-list-row"><span><E23Icon name="storage" size={20} /><b>数据位置</b></span><strong>当前设备</strong></div>
      </section>

      <div className="truth-notice"><E23Icon name="shield" size={20} /><p>测试版没有真实短信、微信授权或云端同步。跑步与账号数据保存在当前设备，请勿将本入口视为正式账号服务。</p></div>

      <section className="profile-list-card">
        <button className="profile-list-row profile-row-button" onClick={exportLocalData}><span><E23Icon name="download" size={20} /><b>导出本机数据</b></span><span>{exported ? '已导出' : 'JSON文件'}<E23Icon name="chevron" size={17} /></span></button>
        <div className="profile-list-row"><span><E23Icon name="book" size={20} /><b>隐私说明</b></span><strong>仅本机存储</strong></div>
        <div className="profile-list-row"><span><E23Icon name="info" size={20} /><b>版本</b></span><strong>{BRAND.VERSION}</strong></div>
      </section>

      <button className="profile-logout" onClick={onLogout}><E23Icon name="logout" size={19} />退出登录</button>
      <p className="profile-safe-note">退出不会删除本机跑步数据。</p>
    </div>
  );
}
