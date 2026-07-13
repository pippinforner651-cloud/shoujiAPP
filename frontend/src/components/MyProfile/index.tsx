import { useState, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { useRunStore } from '../../store/runStore';
import { useAchievementStore } from '../../store/achievementStore';
import { getRouteData } from '../../data/routeLoader';
import { AVATAR_OPTIONS } from '../../types/user';
import { analyzeStreak } from '../../services/activityAnalysis/streakAnalysis';
import { getCalendarMonth, getHeatColor } from '../../services/calendarService';
import { post } from '../../services/cloud/apiClient';
import DeviceManager from './DeviceManager';
import CustomerService from './CustomerService';
import MonthlyReport from './MonthlyReport';
import AccountSecurity from './AccountSecurity';
import InviteFriend from './InviteFriend';

interface Props {
  onLogout: () => void;
}

export default function MyProfile({ onLogout }: Props) {
  const { account, setNickname, setAvatar } = useUserStore();
  const { records, stats } = useRunStore();
  const { userAchievements, level } = useAchievementStore();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [showAll, setShowAll] = useState(false);

  const { nodes } = getRouteData();
  const virtualKm = stats.totalDistanceKm * 10;
  const reachedCities = nodes.filter((n) => virtualKm >= n.totalDistanceKm);
  const currentCity = reachedCities[reachedCities.length - 1]?.city || '深圳';
  const nextCity = nodes[reachedCities.length]?.city || '🏁 完成';
  const streak = analyzeStreak(records);
  const unlockedCount = userAchievements.filter((a) => a.unlocked).length;
  const runnerTitle = getRunnerTitle(stats.totalDistanceKm, streak.currentStreak, reachedCities.length);
  const now = new Date();
  const cal = getCalendarMonth(records, now.getFullYear(), now.getMonth());

  useEffect(() => { post('/events/track', { user_id: account.id, event_type: 'open_profile' }); }, [account.id]);

  const avatarEmoji = account.avatar === 'wechat' ? (account.wechatAvatar ? null : '🧑')
    : (AVATAR_OPTIONS.find((a) => a.key === account.avatar)?.emoji || '🧑');

  const maskPhone = (p?: string) => p ? p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
  const maskName = (n?: string) => n ? n[0] + '*' : '';

  // 第一屏：核心身份卡
  const renderHero = () => (
    <div className="mp-hero" style={{
      background: `linear-gradient(135deg, rgba(79, 195, 247, 0.12), rgba(41, 182, 246, 0.04)), url('data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg"><path d="M0 15 Q25 5 50 15 T100 15" stroke="rgba(255,255,255,0.03)" fill="none" stroke-width="0.5"/></svg>')}') repeat-x bottom`
    }}>
      <div className="mp-hero-avatar">
        {account.avatar === 'wechat' && account.wechatAvatar ? (
          <img src={account.wechatAvatar} alt="" className="mp-hero-img" />
        ) : (
          <span className="mp-hero-emoji">{avatarEmoji}</span>
        )}
      </div>
      <div className="mp-hero-name">{account.nickname}</div>
      <div className="mp-hero-title">{runnerTitle} · Lv.{level.level}</div>
      <div className="mp-hero-id">
        {account.loginType === 'wechat' ? '💬 微信' : account.loginType === 'phone' ? '📱 手机' : '👤 游客'}
        {account.wechatNickname && ` · ${account.wechatNickname}`}
      </div>
      <div className="mp-hero-stats">
        <div className="mp-hstat"><span className="mp-hstat-val">{stats.totalDistanceKm.toFixed(0)}</span><span className="mp-hstat-label">累计km</span></div>
        <div className="mp-hstat"><span className="mp-hstat-val">{records.length}</span><span className="mp-hstat-label">跑步</span></div>
        <div className="mp-hstat"><span className="mp-hstat-val">{streak.currentStreak}</span><span className="mp-hstat-label">连续天</span></div>
        <div className="mp-hstat"><span className="mp-hstat-val">{currentCity}</span><span className="mp-hstat-label">当前位置</span></div>
      </div>
    </div>
  );

  return (
    <div className="my-profile">
      {/* 第一屏：身份卡 */}
      {renderHero()}

      {/* 核心数据卡片 */}
      <div className="mp-tour">
        <div className="mp-tour-title">🗺️ 前往 {nextCity}</div>
        <div className="mp-tour-bar"><div className="mp-tour-fill" style={{ width: `${(reachedCities.length / nodes.length) * 100}%` }} /></div>
        <div className="mp-tour-info">{reachedCities.length}/{nodes.length} 城市 · 虚拟 {virtualKm.toLocaleString()} km</div>
        <div className="mp-tour-sub" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>
          还需 {nodes[reachedCities.length] ? (nodes[reachedCities.length].totalDistanceKm - virtualKm).toFixed(0) : 0} 虚拟km到达 {nextCity}
        </div>
      </div>

      {/* 运动报告 */}
      <MonthlyReport />

      {/* 展开/收起按钮 */}
      <button className="mp-expand-btn" onClick={() => setShowAll(!showAll)}>
        {showAll ? '收起详情 ▲' : '展开全部详情 ▼'}
      </button>

      {showAll && (
        <>
          {/* 编辑资料 */}
          <div className="mp-section">
            <div className="mp-section-title">✏️ 编辑资料</div>
            <div className="mp-edit-grid">
              <div className="mp-edit-field">
                <span className="mp-edit-label">头像</span>
                <div className="mp-avatar-row">
                  <button className={`mp-avatar-opt ${account.avatar === 'wechat' ? 'active' : ''}`}
                    onClick={() => account.wechatAvatar && setAvatar('wechat')} title="微信头像">💬</button>
                  {AVATAR_OPTIONS.filter((o) => o.key !== 'wechat').map((opt) => (
                    <button key={opt.key} className={`mp-avatar-opt ${account.avatar === opt.key ? 'active' : ''}`}
                      onClick={() => setAvatar(opt.key)} title={opt.label}>{opt.emoji}</button>
                  ))}
                </div>
              </div>
              <div className="mp-edit-field">
                <span className="mp-edit-label">APP昵称</span>
                {editingNickname ? (
                  <div className="mp-edit-row">
                    <input className="mp-input" value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)} placeholder="输入昵称" />
                    <button className="mp-save-btn" onClick={() => { setNickname(nicknameInput); setEditingNickname(false); }}>保存</button>
                  </div>
                ) : (
                  <div className="mp-value-row">
                    <span className="mp-value">{account.nickname}</span>
                    <button className="mp-edit-btn" onClick={() => { setNicknameInput(account.nickname); setEditingNickname(true); }}>修改</button>
                  </div>
                )}
              </div>
              {account.wechatNickname && <div className="mp-edit-field readonly"><span className="mp-edit-label">微信昵称</span><span className="mp-value muted">{account.wechatNickname}</span></div>}
              {account.realName && <div className="mp-edit-field readonly"><span className="mp-edit-label">真实姓名</span><span className="mp-value muted">{maskName(account.realName)}</span></div>}
              {account.phone && <div className="mp-edit-field readonly"><span className="mp-edit-label">手机号</span><span className="mp-value muted">{maskPhone(account.phone)}</span></div>}
            </div>
          </div>

          {/* 勋章 */}
          <div className="mp-section">
            <div className="mp-section-header">
              <span className="mp-section-title">🏅 勋章 ({unlockedCount}/{userAchievements.length})</span>
            </div>
            {unlockedCount === 0 ? (
              <div className="mp-empty">开始跑步获得你的第一枚勋章</div>
            ) : (
              <div className="mp-badges">
                {userAchievements.filter((a) => a.unlocked).slice(0, 12).map((ua) => (
                  <div key={ua.achievementId} className="mp-badge">
                    <span className="mp-badge-icon">🏆</span>
                    <span className="mp-badge-name">{ua.achievementId.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 称号 */}
          <div className="mp-section">
            <div className="mp-section-title">👑 称号</div>
            <div className="mp-titles">
              <div className="mp-title-item">{runnerTitle}</div>
              <div className="mp-title-item">Lv.{level.level} {level.title}</div>
              {streak.currentStreak >= 3 && <div className="mp-title-item">🔥 连续{streak.currentStreak}天</div>}
            </div>
          </div>

          {/* 日历 */}
          <div className="mp-section">
            <div className="mp-section-title">
              📅 {now.getFullYear()}年{now.getMonth() + 1}月
              <span className="mp-cal-legend">
                <span className="mp-legend-dot" />0<span className="mp-legend-dot" style={{ background: getHeatColor(1) }} />1-5
                <span className="mp-legend-dot" style={{ background: getHeatColor(3) }} />5-10
                <span className="mp-legend-dot" style={{ background: getHeatColor(4) }} />10+
              </span>
            </div>
            <div className="mp-calendar">
              {['日', '一', '二', '三', '四', '五', '六'].map((d) => (<span key={d} className="mp-cal-header">{d}</span>))}
              {Array.from({ length: cal.firstDayOfWeek }).map((_, i) => (<span key={`e${i}`} className="mp-cal-empty" />))}
              {cal.days.map((day) => (
                <span key={day.date} className="mp-cal-day" style={{ background: getHeatColor(day.heatLevel) }} title={day.distanceKm > 0 ? `${day.distanceKm} km` : ''}>
                  {day.distanceKm > 0 ? <span className="mp-cal-day-text">{day.day}</span> : day.day}
                </span>
              ))}
            </div>
          </div>

          {/* 设备 */}
          <DeviceManager />

          {/* 客服 */}
          <CustomerService />

          {/* 邀请 */}
          <InviteFriend />

          {/* 账号安全 */}
          <AccountSecurity />
        </>
      )}

      {/* 退出 */}
      <button className="mp-logout-btn" onClick={onLogout}>退出登录</button>
    </div>
  );
}

function getRunnerTitle(totalKm: number, streak: number, cities: number): string {
  if (totalKm >= 1000) return '🦄 千里马';
  if (totalKm >= 500) return '🏆 环游探索者';
  if (totalKm >= 100) return '🥇 百里跑者';
  if (totalKm >= 42) return '🏅 马拉松跑者';
  if (streak >= 7) return '🔥 坚持跑者';
  if (cities >= 2) return '🗺️ 城市探索者';
  return '👟 新手跑者';
}
