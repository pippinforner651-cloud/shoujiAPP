import E23Icon from '../components/E23Icon';

interface Props {
  onStartRun: () => void;
  onExploreHome: () => void;
}

const guideItems = [
  { number: '01', title: '真实1公里，旅程前进10公里', body: '折算比例固定为1:10，所有路线页面使用同一份进度。' },
  { number: '02', title: '跑步推动48城环游路线', body: '每次保存后都会更新当前位置、下一站和城市解锁。' },
  { number: '03', title: '记录主要保存在本设备', body: '当前是测试版，尚未接入云同步，请不要卸载或清除浏览器数据。' },
];

export default function FirstRunGuide({ onStartRun, onExploreHome }: Props) {
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
