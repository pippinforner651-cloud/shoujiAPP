import { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { useRunStore } from '../../store/runStore';
import { useAchievementStore } from '../../store/achievementStore';
import { getRouteData } from '../../data/routeLoader';
import { get } from '../../services/cloud/apiClient';
import { AVATAR_OPTIONS } from '../../types/user';

export default function UserProfilePage() {
  const { account, initialize } = useUserStore();
  const { stats, initialize: initRun } = useRunStore();
  const { userAchievements, level, initialize: initAch } = useAchievementStore();
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [globalTotal, setGlobalTotal] = useState(0);

  useEffect(() => { initialize(); initRun(); initAch(); }, [initialize, initRun, initAch]);

  useEffect(() => {
    (async () => {
      const res = await get<{
        leaderboard: Array<{ user_id: string; total_distance_km: number }>;
        total_participants: number; global_total_km: number;
      }>('/leaderboard?limit=100');
      if (res.success && res.data) {
        setGlobalTotal(res.data.global_total_km);
        const idx = res.data.leaderboard.findIndex((u) => u.user_id === account.id);
        setGlobalRank(idx >= 0 ? idx + 1 : res.data.leaderboard.length + 1);
      }
    })();
  }, [account.id]);

  const { nodes } = getRouteData();
  const virtualKm = stats.totalDistanceKm * 10;
  const reachedCities = nodes.filter((n) => virtualKm >= n.totalDistanceKm);
  const unlockedCount = reachedCities.length;

  // 显示的头像
  const displayAvatar = account.avatar === 'wechat'
    ? (account.wechatAvatar || '🧑')
    : (AVATAR_OPTIONS.find((a) => a.key === account.avatar)?.emoji || '🧑');

  // 显示的名称
  const displayName = account.nickname || account.wechatNickname || '跑者';

  return (
    <div className="user-profile-page">
      {/* 头像 + 昵称 */}
      <div className="up-header">
        {account.avatar === 'wechat' && account.wechatAvatar ? (
          <img src={account.wechatAvatar} alt="avatar" className="up-avatar-img" />
        ) : (
          <div className="up-avatar">{displayAvatar}</div>
        )}
        <div className="up-nickname">{displayName}</div>
        {account.wechatNickname && account.wechatNickname !== displayName && (
          <div className="up-wechat-name">微信昵称: {account.wechatNickname}</div>
        )}
        <div className="up-badge">Lv.{level.level} {level.title}</div>
        <div className="up-login-type">
          {account.isGuest ? '👤 游客模式' : account.loginType === 'wechat' ? '💬 微信已绑定' : '🔐 已登录'}
        </div>
      </div>

      {/* 关键数据 */}
      <div className="up-stats">
        <div className="up-stat">
          <div className="up-stat-val">{stats.totalDistanceKm.toFixed(0)}</div>
          <div className="up-stat-label">累计跑量 (km)</div>
        </div>
        <div className="up-stat">
          <div className="up-stat-val">{virtualKm.toLocaleString()}</div>
          <div className="up-stat-label">虚拟环游 (km)</div>
        </div>
        <div className="up-stat">
          <div className="up-stat-val">{globalRank ?? '--'}</div>
          <div className="up-stat-label">全国排名</div>
        </div>
      </div>

      {/* 环游进度 */}
      <div className="up-section">
        <div className="up-section-title">🗺️ 环游进度</div>
        <div className="up-city-line">
          <span className="up-city-current">{reachedCities[reachedCities.length - 1]?.city || '深圳'}</span>
          <span className="up-city-next">→ {nodes[unlockedCount]?.city || '🏁 完成'}</span>
        </div>
        <div className="up-city-count">已到 {unlockedCount} / {nodes.length} 个城市</div>
        <div className="up-bar">
          <div className="up-bar-fill" style={{ width: `${(unlockedCount / nodes.length) * 100}%` }} />
        </div>
      </div>

      {/* 成就 */}
      <div className="up-section">
        <div className="up-section-title">🏆 成就 ({userAchievements.filter((a) => a.unlocked).length})</div>
        <div className="up-xp-bar">
          <div className="up-xp-label">经验值 {level.currentXp}/{level.nextLevelXp}</div>
          <div className="up-bar">
            <div className="up-bar-fill gold" style={{
              width: `${Math.min(100, (level.currentXp / level.nextLevelXp) * 100)}%`
            }} />
          </div>
        </div>
      </div>

      {/* 账户信息 */}
      <div className="up-section up-account">
        <div className="up-section-title">🔐 账户信息</div>
        <div className="up-account-row"><span>用户 ID</span><span>{account.id.slice(0, 16)}...</span></div>
        <div className="up-account-row"><span>登录方式</span><span>{account.loginType || 'guest'}</span></div>
        {account.wechatOpenid && (
          <div className="up-account-row"><span>微信绑定</span><span>✅</span></div>
        )}
        <div className="up-account-row"><span>全国参与者</span><span>{globalTotal.toFixed(0)} km / 人</span></div>
      </div>
    </div>
  );
}
