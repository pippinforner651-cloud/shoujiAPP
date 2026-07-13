import { useEffect, useState } from 'react';
import { getRouteData } from '../../data/routeLoader';
import { useRunStore } from '../../store/runStore';

interface CityRecord {
  order: number;
  name: string;
  province: string;
  description: string;
  routeSource: string;
  /** 用户到达该城市的日期（基于跑步日期排序） */
  reachedAt?: string;
}

export default function TravelBook() {
  const { records, initialize } = useRunStore();
  const [reachedCities, setReachedCities] = useState<CityRecord[]>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const { nodes } = getRouteData();
    if (!nodes.length || !records.length) {
      setReachedCities([]);
      return;
    }

    // 计算已到达城市
    const totalKm = records.reduce((s, r) => s + r.distanceKm, 0);
    const virtualKm = totalKm * 10;

    const reached: CityRecord[] = [];
    for (const node of nodes) {
      if (virtualKm >= node.totalDistanceKm) {
        reached.push({
          order: node.order,
          name: node.city,
          province: node.province,
          description: node.description,
          routeSource: node.routeSource,
        });
      } else {
        break; // 节点按距离排序，一旦未到达就停止
      }
    }

    // 基于跑步记录，为每个城市分配到达日期
    const sortedRecords = [...records].sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    let cumKm = 0;
    let recIdx = 0;
    for (const city of reached) {
      const cityVirtualNeeded = nodes.find((n) => n.city === city.name)?.totalDistanceKm || Infinity;
      // 累积跑量直到虚拟距离足够
      while (recIdx < sortedRecords.length && cumKm * 10 < cityVirtualNeeded) {
        cumKm += sortedRecords[recIdx].distanceKm;
        recIdx++;
      }
      if (cumKm * 10 >= cityVirtualNeeded) {
        city.reachedAt = sortedRecords[Math.min(recIdx - 1, sortedRecords.length - 1)].date;
      } else {
        city.reachedAt = '进行中';
      }
    }

    setReachedCities(reached);
  }, [records]);

  if (!reachedCities.length) {
    return (
      <div className="travel-book">
        <div className="tb-title">📖 城市纪念册</div>
        <div className="tb-empty">尚未到达任何城市，开始跑步吧！</div>
      </div>
    );
  }

  return (
    <div className="travel-book">
      <div className="tb-title">📖 城市纪念册</div>
      <div className="tb-count">已到达 {reachedCities.length} / 48 个城市</div>
      <div className="tb-list">
        {reachedCities.map((city) => (
          <div key={city.order} className="tb-city">
            <div className="tb-city-header">
              <span className="tb-city-order">#{city.order}</span>
              <span className="tb-city-name">{city.name}</span>
              <span className="tb-city-reached">{city.reachedAt}</span>
            </div>
            <div className="tb-city-detail">
              <span className="tb-province">📍 {city.province}</span>
              <span className="tb-road">🛣️ {city.routeSource}</span>
            </div>
            <div className="tb-city-desc">{city.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
