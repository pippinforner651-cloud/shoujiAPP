import { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { useProgressStore } from '../../store/progressStore';
import { subscribeProgress } from '../../store/progressStore';
import { AVATAR_OPTIONS } from '../../types/user';

/** 格式化公里显示 */
function fmt(km: number): string {
  if (km >= 10000) return (km / 10000).toFixed(1) + '万';
  if (km >= 1000) return (km / 1000).toFixed(1) + 'k';
  return km.toFixed(0);
}

export default function ProfileCard() {
  const {
    account: profile,
    initialized: userInit,
    initialize: initUser,
    setNickname,
    setAvatar,
  } = useUserStore();

  const {
    info,
    initialized: progInit,
    initialize: initProg,
    refresh,
  } = useProgressStore();

  const [editing, setEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  // 初始化
  useEffect(() => {
    initUser();
    initProg();
    subscribeProgress();
    refresh();
  }, [initUser, initProg, refresh]);

  // 进入编辑模式
  const startEdit = () => {
    setNicknameInput(profile.nickname);
    setEditing(true);
  };

  // 保存昵称
  const saveNickname = () => {
    setNickname(nicknameInput);
    setEditing(false);
  };

  const ready = userInit && progInit;
  const avatarEmoji = AVATAR_OPTIONS.find((a) => a.key === profile.avatar)?.emoji ?? '🧑';

  if (!ready) {
    return (
      <div className="profile-card loading">
        <div className="profile-loading">加载中...</div>
      </div>
    );
  }

  const isComplete = info.virtualKm >= info.totalVirtualKm;

  return (
    <div className="profile-card">
      {/* 用户信息行 */}
      <div className="profile-row">
        <div className="profile-avatar">
          <span className="profile-avatar-emoji">{avatarEmoji}</span>
        </div>
        <div className="profile-info">
          {editing ? (
            <div className="profile-edit">
              <input
                className="profile-input"
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={12}
                autoFocus
                placeholder="输入昵称"
                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
              />
              <button className="btn-save" onClick={saveNickname}>保存</button>
              <button className="btn-cancel" onClick={() => setEditing(false)}>取消</button>
            </div>
          ) : (
            <>
              <div className="profile-nickname" onClick={startEdit}>
                {profile.nickname || '跑者'}
                <span className="profile-edit-icon">✏️</span>
              </div>
              <div className="profile-since">
                加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </>
          )}
        </div>

        {/* 头像切换 */}
        <div className="profile-avatar-switch">
          {AVATAR_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`avatar-opt ${profile.avatar === opt.key ? 'active' : ''}`}
              onClick={() => setAvatar(opt.key)}
              title={opt.label}
            >
              {opt.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="profile-divider" />

      {/* 统计数据 */}
      <div className="profile-stats">
        <div className="profile-stat">
          <div className="ps-label">累计跑量</div>
          <div className="ps-value">{info.realKm.toFixed(1)}</div>
          <div className="ps-unit">公里</div>
        </div>
        <div className="profile-stat">
          <div className="ps-label">虚拟位置</div>
          <div className="ps-value accent">
            {isComplete ? '🏁' : fmt(info.virtualKm)}
          </div>
          <div className="ps-unit">/ {fmt(info.totalVirtualKm)} km</div>
        </div>
        <div className="profile-stat">
          <div className="ps-label">完成比例</div>
          <div className="ps-value">{info.completionRate.toFixed(1)}</div>
          <div className="ps-unit">%</div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="profile-bar-wrap">
        <div
          className="profile-bar-fill"
          style={{ width: `${Math.min(info.completionRate, 100)}%` }}
        />
      </div>

      {/* 当前状态 */}
      <div className="profile-status">
        <span className="ps-emoji">{isComplete ? '🏆' : '🚗'}</span>
        <span className="ps-text">
          {isComplete ? '🎉 已完成全程环游！' : `正在前往 ${info.headingToCity}`}
        </span>
      </div>
    </div>
  );
}
