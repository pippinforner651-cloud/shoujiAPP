import { useState } from 'react';
import { useUserStore } from '../../store/userStore';

export default function InviteFriend() {
  const { account } = useUserStore();
  const [copied, setCopied] = useState(false);

  const inviteCode = account.id.slice(-8).toUpperCase();
  const inviteLink = `https://chinarun.app/invite?code=${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`全民环游中国邀请你一起跑步！\n邀请码：${inviteCode}\n${inviteLink}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="mp-section mp-invite">
      <div className="mp-section-title">📨 邀请好友</div>
      <div className="invite-card">
        <div className="invite-icon">🎉</div>
        <div className="invite-text">
          邀请好友加入全民环游中国
          <br />
          一起用脚步丈量中国！
        </div>
        <div className="invite-code-box">
          <span className="invite-code-label">邀请码</span>
          <span className="invite-code">{inviteCode}</span>
        </div>
        <button className="invite-btn" onClick={handleCopy}>
          {copied ? '✅ 已复制' : '📋 复制邀请信息'}
        </button>
      </div>
    </div>
  );
}
