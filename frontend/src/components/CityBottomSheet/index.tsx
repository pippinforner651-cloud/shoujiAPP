import { useEffect, useState } from 'react';
import E23Icon from '../E23Icon';
import { getCityArrivalContent } from '../../data/cityContent';
import { getRouteData } from '../../data/routeLoader';
import { useCityStore } from '../../store/cityStore';

export default function CityBottomSheet() {
  const alertCity = useCityStore((state) => state.alertCity);
  const dismissAlert = useCityStore((state) => state.dismissAlert);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (alertCity) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
      return;
    }
    setAnimating(false);
    const timer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timer);
  }, [alertCity]);

  if ((!visible && !alertCity) || !alertCity) return null;
  const { nodes, closure } = getRouteData();
  const node = nodes.find((item) => item.order === alertCity.order);
  const nextNode = alertCity.order < nodes.length ? nodes[alertCity.order] : nodes[0];
  const nextDistanceKm = node?.nextDistanceKm ?? (alertCity.order === nodes.length ? closure.distanceKm : 0);
  const content = getCityArrivalContent(alertCity.city, alertCity.order);

  return (
    <>
      <button className={`bts-overlay ${animating ? 'show' : ''}`} onClick={dismissAlert} aria-label="关闭到站反馈" />
      <section className={`bts-panel arrival-panel ${animating ? 'show' : ''}`} role="dialog" aria-modal="true" aria-label={`${alertCity.city}到站`}>
        <div className="bts-handle"><div className="bts-handle-bar" /></div>
        <div className="arrival-badge"><E23Icon name="route" size={30} /></div>
        <p className="section-kicker">到站 · {content.badgeLabel}</p>
        <div className="arrival-title"><div><h2>{alertCity.city}</h2><span>{alertCity.province} · 第{alertCity.order}站</span></div><strong>{content.tagline}</strong></div>
        <p className="arrival-message">{content.arrivalMessage}</p>
        <div className="arrival-metrics">
          <div><span>到站累计虚拟里程</span><strong>{alertCity.unlockKm.toLocaleString()} km</strong></div>
          <div><span>路线进度</span><strong>{Math.round((alertCity.unlockKm / 21423) * 1000) / 10}%</strong></div>
        </div>
        <div className="arrival-next-card">
          <div><span>下一站</span><strong>{nextNode?.city ?? '深圳'}</strong></div>
          <div><span>下一段距离</span><strong>{nextDistanceKm.toLocaleString()} 虚拟km</strong></div>
        </div>
        <button className="bts-close" onClick={dismissAlert}>继续前往{nextNode?.city ?? '深圳'}</button>
      </section>
    </>
  );
}
