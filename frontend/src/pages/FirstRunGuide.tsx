import E23Icon from '../components/E23Icon';
import { IS_V2_PREVIEW } from '../config/buildVariant';

interface Props {
  onStartRun: () => void;
  onExploreHome: () => void;
}

const v1GuideItems = [
  { number: '01', title: '真实1公里，旅程前进10公里', body: '折算比例固定为1:10，所有路线页面使用同一份进度。' },
  { number: '02', title: '跑步推动48城环游路线', body: '每次保存后都会更新当前位置、下一站和城市解锁。' },
  { number: '03', title: '记录主要保存在本设备', body: '当前是测试版，尚未接入云同步，请不要卸载或清除浏览器数据。' },
];

export default function FirstRunGuide({ onStartRun, onExploreHome }: Props) {
  const guideItems = IS_V2_PREVIEW ? [
    { number: '01', title: '有效运动1公里，个人贡献1公里', body: 'V2预览按真实1:1展示个人里程，不做虚拟翻倍。' },
    { number: '02', title: '27,000+公里路线正在核验', body: 'V2正式路线尚未上线；当前中国地图仅用于界面与个人进度预览。' },
    { number: '03', title: '记录主要保存在本设备', body: '多人、排行榜和云同步尚未启用，不会生成假全班进度。' },
  ] : v1GuideItems;
  return (
    <main className="first-guide-page">
      <div className="first-guide-mark"><E23Icon name="route" size={34} /></div>
      <p className="first-guide-kicker">欢迎加入 E23跑起来</p>
      <h1>把第一公里，跑成一段中国旅程</h1>
      <p className="first-guide-intro">三件事了解完成，就可以出发。</p>
      <div className="first-guide-list">
        {guideItems.map((item) => (
          <article className="first-guide-item" key={item.number}>
            <span>{item.number}</span><div><h2>{item.title}</h2><p>{item.body}</p></div>
          </article>
        ))}
      </div>
      <button className="primary-action" onClick={onStartRun}>录入第一条跑步</button>
      <button className="text-action" onClick={onExploreHome}>先看看旅程首页</button>
    </main>
  );
}
