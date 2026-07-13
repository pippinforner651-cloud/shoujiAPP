import { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { get } from '../../services/cloud/apiClient';

interface FriendEntry {
  id: string;
  nickname: string;
  avatar: string;
  avatar_url?: string;
  level: number;
  total_distance_km: number;
  run_count: number;
}

export default function FriendsList() {
  const { account } = useUserStore();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [friendRanking, setFriendRanking] = useState<FriendEntry[]>([]);

  useEffect(() => {
    if (!account.id) return;

    // 好友列表
    get<{ friends: FriendEntry[] }>(`/friends/list/${account.id}`).then((res) => {
      if (res.success && res.data) setFriends(res.data.friends);
    });

    // 好友排行榜
    get<{ leaderboard: FriendEntry[] }>(`/leaderboard/friends/${account.id}`).then((res) => {
      if (res.success && res.data) setFriendRanking(res.data.leaderboard);
    });
  }, [account.id]);

  return (
    <div className="friends-card">
      <div className="friends-header">
        <span className="friends-title">🤝 好友</span>
        <span className="friends-count">{friends.length} 人</span>
      </div>

      {/* 好友排行榜 */}
      {friendRanking.length > 0 && (
        <div className="friends-section">
          <div className="friends-subtitle">🏆 好友排行榜</div>
          <div className="friends-ranking">
            {friendRanking.map((f, i) => (
              <div key={f.id} className={`friends-row ${i < 3 ? 'top' : ''}`}>
                <span className="fr-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="fr-avatar">{f.avatar_url ? '🧑' : f.avatar === 'default' ? '🧑' : '🏃'}</span>
                <span className="fr-name">{f.nickname}</span>
                <span className="fr-km">{f.total_distance_km.toFixed(0)} km</span>
                <span className="fr-level">Lv.{f.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && (
        <div className="friends-empty">
          暂无好友，通过邀请码添加好友开始共同环游
        </div>
      )}
    </div>
  );
}
