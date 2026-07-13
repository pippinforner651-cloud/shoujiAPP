import { useState } from 'react';

const FEEDBACK_TYPES = ['登录问题', '数据问题', '地图问题', '设备问题', '功能建议', '其他'];

const FAQS = [
  { q: '如何开始跑步？', a: '点击底部「跑步」Tab，授权 GPS 后即可开始跑步。跑步结束后会自动记录到你个人数据中。' },
  { q: '如何绑定运动设备？', a: '进入「我的」→「运动设备」，点击设备的「绑定」按钮即可。当前为模拟绑定。' },
  { q: '数据不同步怎么办？', a: '点击「我的」→「☁️ 同步数据」按钮手动同步。如果仍有问题，请尝试刷新页面或重新登录。' },
  { q: '如何邀请好友？', a: '目前复制你的邀请码发送给好友即可。点击「邀请好友」生成邀请信息。' },
  { q: '跑步距离不准？', a: 'GPS 精度受天气和环境影响，建议在室外开阔地带跑步。我们使用 Haversine 公式计算两点间距离。' },
];

export default function CustomerService() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbType, setFbType] = useState('');
  const [fbContent, setFbContent] = useState('');
  const [fbSubmitted, setFbSubmitted] = useState(false);

  const handleSubmitFeedback = () => {
    if (!fbType || !fbContent) return;
    console.log('[Feedback]', { type: fbType, content: fbContent, time: new Date().toISOString() });
    setFbSubmitted(true);
    setTimeout(() => { setShowFeedback(false); setFbSubmitted(false); setFbType(''); setFbContent(''); }, 2000);
  };

  return (
    <div className="mp-section">
      <div className="mp-section-title">🛟 客服中心</div>

      {/* 常见问题 */}
      <div className="cs-section">
        <div className="cs-subtitle">❓ 常见问题</div>
        {FAQS.map((faq, i) => (
          <div key={i} className="cs-faq-item">
            <button className="cs-faq-question" onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
              <span>{faq.q}</span>
              <span className={`cs-arrow ${expandedIdx === i ? 'open' : ''}`}>▾</span>
            </button>
            {expandedIdx === i && <div className="cs-faq-answer">{faq.a}</div>}
          </div>
        ))}
      </div>

      {/* 意见反馈 */}
      <div className="cs-section">
        <div className="cs-subtitle">📩 意见反馈</div>
        {!showFeedback ? (
          <button className="cs-feedback-btn" onClick={() => setShowFeedback(true)}>📝 填写反馈</button>
        ) : fbSubmitted ? (
          <div className="cs-submitted">✅ 感谢你的反馈，我们会尽快处理！</div>
        ) : (
          <div className="cs-feedback-form">
            <div className="cs-fb-types">
              {FEEDBACK_TYPES.map((t) => (
                <button key={t} className={`cs-fb-type ${fbType === t ? 'active' : ''}`} onClick={() => setFbType(t)}>
                  {t}
                </button>
              ))}
            </div>
            <textarea className="cs-fb-textarea" placeholder="请描述你遇到的问题或建议..." rows={4}
              value={fbContent} onChange={(e) => setFbContent(e.target.value)} />
            <div className="cs-fb-actions">
              <button className="cs-fb-cancel" onClick={() => setShowFeedback(false)}>取消</button>
              <button className="cs-fb-submit" onClick={handleSubmitFeedback} disabled={!fbType || !fbContent}>
                提交
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 联系客服 */}
      <div className="cs-section">
        <div className="cs-subtitle">💬 联系我们</div>
        <div className="cs-contact-list">
          <div className="cs-contact-item">
            <span className="cs-contact-icon">📩</span>
            <div>
              <div className="cs-contact-label">意见反馈</div>
              <div className="cs-contact-val">feedback@chinarun.app</div>
            </div>
          </div>
          <div className="cs-contact-item">
            <span className="cs-contact-icon">💬</span>
            <div>
              <div className="cs-contact-label">客服微信</div>
              <div className="cs-contact-val">chinarun_cs</div>
            </div>
          </div>
          <div className="cs-contact-item">
            <span className="cs-contact-icon">🕐</span>
            <div>
              <div className="cs-contact-label">工作时间</div>
              <div className="cs-contact-val">周一至周五 9:00-18:00</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
