import { useUserStore } from '../../store/userStore';

interface Props {}

export default function AccountSecurity(_props: Props) {
  const { account } = useUserStore();

  const maskPhone = (p?: string) => p ? p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定';
  const maskName = (n?: string) => n ? n[0] + '*' : '未填写';

  return (
    <div className="mp-section">
      <div className="mp-section-title">🔐 账号安全</div>
      <div className="as-list">
        <div className="as-item">
          <div className="as-info">
            <span className="as-icon">📱</span>
            <div>
              <div className="as-label">手机号绑定</div>
              <div className="as-val">{account.phone ? maskPhone(account.phone) : '未绑定'}</div>
            </div>
          </div>
          <span className="as-status">{account.phone ? '✅' : '未绑定'}</span>
        </div>

        <div className="as-item">
          <div className="as-info">
            <span className="as-icon">💬</span>
            <div>
              <div className="as-label">微信绑定</div>
              <div className="as-val">{account.wechatNickname || '未绑定'}</div>
            </div>
          </div>
          <span className="as-status">{account.wechatOpenid ? '✅' : '未绑定'}</span>
        </div>

        <div className="as-item">
          <div className="as-info">
            <span className="as-icon">🆔</span>
            <div>
              <div className="as-label">真实姓名</div>
              <div className="as-val">{maskName(account.realName)}</div>
            </div>
          </div>
        </div>

        <div className="as-item">
          <div className="as-info">
            <span className="as-icon">🕐</span>
            <div>
              <div className="as-label">最近登录</div>
              <div className="as-val">{new Date().toLocaleString('zh-CN')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="as-login-hist">
        <div className="as-subtitle">登录设备</div>
        <div className="as-device">Chrome on Windows · 深圳 · {new Date().toLocaleString('zh-CN')}</div>
      </div>

      <button className="as-delete-btn" onClick={() => {
        if (confirm('确定要注销账号吗？此操作不可恢复，所有跑步记录将永久删除。')) {
          alert('账号注销申请已提交');
        }
      }}>注销账号</button>
    </div>
  );
}
